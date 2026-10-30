"""MANILA: real, explainable binary-classification fairness pipeline.

This module intentionally contains no random metric generator and no silent
fallback to a supposedly "fair" value. Every reported number is computed from
predictions produced by an actual scikit-learn model.

Implemented capabilities
------------------------
* Data-readiness checks with actionable errors and warnings.
* Context-aware, transparent metric recommendations.
* Real model training with scikit-learn pipelines.
* Real reweighing mitigation (Kamiran & Calders formulation).
* Optional Fairlearn ThresholdOptimizer when Fairlearn is installed.
* Group metrics, fairness gaps, bootstrap confidence intervals and Pareto data.
* Intersectional sensitive groups (for example, sex × race).
"""
from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    MaxAbsScaler,
    MinMaxScaler,
    OneHotEncoder,
    RobustScaler,
    StandardScaler,
)
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

try:  # Optional dependency; the rest of the pipeline remains fully usable.
    from fairlearn.postprocessing import ThresholdOptimizer

    FAIRLEARN_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on deployment environment
    ThresholdOptimizer = None  # type: ignore[assignment]
    FAIRLEARN_AVAILABLE = False

RANDOM_STATE = 42
DIFFERENCE_METRICS = {
    "Demographic Parity Difference",
    "Equal Opportunity Difference",
    "Equalized Odds Difference",
    "Average Odds Difference",
    "False Positive Rate Difference",
    "False Negative Rate Difference",
    "Predictive Parity Difference",
}
RATIO_METRICS = {"Disparate Impact Ratio"}
SUPPORTED_FAIRNESS_METRICS = DIFFERENCE_METRICS | RATIO_METRICS
SUPPORTED_EFFECTIVENESS_METRICS = {
    "Accuracy",
    "F1",
    "Precision",
    "Recall",
    "ROC-AUC",
}


@dataclass(frozen=True)
class PreparedData:
    X: pd.DataFrame
    y: np.ndarray
    sensitive: np.ndarray
    sensitive_name: str
    dropped_rows: int


def make_demo_hiring_dataset(n: int = 1600, seed: int = 7) -> pd.DataFrame:
    """Create an explicitly synthetic hiring dataset for a live demonstration.

    The dataset contains embedded historical bias, but the metrics and model
    results produced from it are real computations. It must never be presented
    as the real Adult Income, COMPAS or German Credit dataset.
    """
    rng = np.random.default_rng(seed)
    gender = rng.choice(["Woman", "Man"], n, p=[0.45, 0.55])
    region = rng.choice(["EU", "Non-EU"], n, p=[0.72, 0.28])
    experience = np.clip(rng.normal(5.5, 3.0, n), 0, 18)
    assessment = np.clip(rng.normal(70, 12, n), 25, 100)
    degree = rng.choice(["No degree", "Bachelor", "Master"], n, p=[0.12, 0.55, 0.33])
    gap_months = np.clip(rng.poisson(4, n), 0, 30)

    degree_score = pd.Series(degree).map({"No degree": -0.7, "Bachelor": 0.2, "Master": 0.65}).to_numpy()
    legitimate_score = (
        -5.0
        + 0.055 * assessment
        + 0.17 * experience
        + degree_score
        - 0.025 * gap_months
        + rng.normal(0, 0.65, n)
    )
    qualified_probability = 1 / (1 + np.exp(-legitimate_score))
    qualified = (rng.random(n) < qualified_probability).astype(int)

    # Historical decision contains additional protected-group effects.
    historical_score = (
        legitimate_score
        + 0.55 * (gender == "Man")
        + 0.35 * (region == "EU")
        + rng.normal(0, 0.45, n)
    )
    hired_probability = 1 / (1 + np.exp(-historical_score))
    hired = (rng.random(n) < hired_probability).astype(int)

    return pd.DataFrame(
        {
            "experience_years": experience.round(2),
            "assessment_score": assessment.round(2),
            "degree": degree,
            "employment_gap_months": gap_months,
            "gender": gender,
            "region": region,
            "qualified": qualified,
            "historical_hired": hired,
        }
    )


def _combine_sensitive_groups(df: pd.DataFrame, sensitive_attrs: Sequence[str]) -> Tuple[pd.Series, str]:
    if not sensitive_attrs:
        raise ValueError("At least one sensitive attribute is required for fairness analysis.")
    missing = [c for c in sensitive_attrs if c not in df.columns]
    if missing:
        raise ValueError(f"Sensitive attribute columns not found: {missing}")

    values = df[list(sensitive_attrs)].astype("string").fillna("<missing>")
    combined = values.apply(lambda row: " | ".join(f"{col}={row[col]}" for col in sensitive_attrs), axis=1)
    return combined, " × ".join(sensitive_attrs)


def prepare_binary_data(
    df: pd.DataFrame,
    *,
    label_column: str,
    positive_label: Any,
    sensitive_attrs: Sequence[str],
    exclude_sensitive_from_features: bool = True,
) -> PreparedData:
    """Validate and prepare a binary-classification dataset."""
    if label_column not in df.columns:
        raise ValueError(f"Label column '{label_column}' was not found.")
    if not sensitive_attrs:
        raise ValueError("Select at least one sensitive attribute.")

    required = [label_column, *sensitive_attrs]
    usable_mask = df[required].notna().all(axis=1)
    clean = df.loc[usable_mask].copy()
    dropped_rows = int((~usable_mask).sum())
    if clean.empty:
        raise ValueError("No rows remain after removing missing labels or sensitive attributes.")

    raw_label = clean[label_column]
    if positive_label is None or str(positive_label) == "":
        unique_labels = list(pd.unique(raw_label))
        if len(unique_labels) != 2:
            raise ValueError("positive_label is required unless the label has exactly two distinct values.")
        positive_label = sorted(unique_labels, key=lambda x: str(x))[-1]

    y = (raw_label.astype(str) == str(positive_label)).astype(int).to_numpy()
    if len(np.unique(y)) != 2:
        raise ValueError(
            f"Positive label '{positive_label}' does not create two classes. "
            "Check the label value and dataset."
        )

    sensitive_series, sensitive_name = _combine_sensitive_groups(clean, sensitive_attrs)
    sensitive = sensitive_series.to_numpy(dtype=str)
    if len(np.unique(sensitive)) < 2:
        raise ValueError("Fairness analysis requires at least two sensitive groups.")

    drop_cols = [label_column]
    if exclude_sensitive_from_features:
        drop_cols.extend(sensitive_attrs)
    X = clean.drop(columns=list(dict.fromkeys(drop_cols)))
    if X.shape[1] == 0:
        raise ValueError("No predictive feature columns remain after removing label and sensitive attributes.")

    return PreparedData(X=X, y=y, sensitive=sensitive, sensitive_name=sensitive_name, dropped_rows=dropped_rows)


def data_readiness_report(
    df: pd.DataFrame,
    *,
    label_column: str,
    positive_label: Any,
    sensitive_attrs: Sequence[str],
    minimum_group_size: int = 30,
) -> Dict[str, Any]:
    """Return a structured readiness report without training a model."""
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    if df.empty:
        errors.append({"code": "EMPTY_DATASET", "message": "The dataset contains no rows."})
    if label_column not in df.columns:
        errors.append(
            {"code": "LABEL_COLUMN_MISSING", "field": label_column, "message": "The label column is missing."}
        )
    missing_sensitive = [c for c in sensitive_attrs if c not in df.columns]
    if not sensitive_attrs:
        errors.append({"code": "NO_SENSITIVE_ATTRIBUTE", "message": "Select at least one sensitive attribute."})
    elif missing_sensitive:
        errors.append(
            {
                "code": "SENSITIVE_COLUMN_MISSING",
                "fields": missing_sensitive,
                "message": "One or more sensitive attribute columns are missing.",
            }
        )

    missing_rates = {
        str(col): round(float(df[col].isna().mean() * 100), 2)
        for col in df.columns
        if df[col].isna().any()
    }
    for col, rate in missing_rates.items():
        if rate >= 20:
            warnings.append(
                {
                    "code": "HIGH_MISSING_RATE",
                    "field": col,
                    "missing_percentage": rate,
                    "message": f"Column '{col}' has {rate:.1f}% missing values.",
                }
            )

    group_counts: Dict[str, int] = {}
    label_distribution: Dict[str, int] = {}
    if not errors:
        try:
            prepared = prepare_binary_data(
                df,
                label_column=label_column,
                positive_label=positive_label,
                sensitive_attrs=sensitive_attrs,
            )
            group_counts = pd.Series(prepared.sensitive).value_counts().astype(int).to_dict()
            label_distribution = pd.Series(prepared.y).value_counts().sort_index().astype(int).rename(index={0: "negative", 1: "positive"}).to_dict()

            for group, count in group_counts.items():
                if count < minimum_group_size:
                    warnings.append(
                        {
                            "code": "SMALL_GROUP",
                            "group": group,
                            "count": count,
                            "minimum_recommended": minimum_group_size,
                            "message": (
                                f"Group '{group}' contains {count} records; disparity estimates may be unstable."
                            ),
                        }
                    )
            positive_rate = float(prepared.y.mean())
            if positive_rate < 0.1 or positive_rate > 0.9:
                warnings.append(
                    {
                        "code": "SEVERE_CLASS_IMBALANCE",
                        "positive_rate": round(positive_rate, 4),
                        "message": "The outcome label is severely imbalanced.",
                    }
                )
            if prepared.dropped_rows:
                warnings.append(
                    {
                        "code": "ROWS_DROPPED",
                        "count": prepared.dropped_rows,
                        "message": "Rows missing a label or sensitive attribute will be excluded.",
                    }
                )
        except ValueError as exc:
            errors.append({"code": "INVALID_CONFIGURATION", "message": str(exc)})

    return {
        "ready": len(errors) == 0,
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "missing_percentage_by_column": missing_rates,
        "label_distribution": label_distribution,
        "intersectional_group_counts": group_counts,
        "errors": errors,
        "warnings": warnings,
    }


def recommend_metrics(
    *,
    primary_harm: str,
    ground_truth_available: bool,
    outcome_is_benefit: bool = True,
) -> Dict[str, Any]:
    """Transparent rule-based recommendation for supported classification metrics."""
    harm = primary_harm.strip().lower()
    selected: List[str]
    rejected: List[Dict[str, str]] = []
    rule_id: str

    if harm in {"qualified_people_rejected", "false_negatives", "missed_benefit"}:
        if ground_truth_available:
            rule_id = "RULE-FN-001"
            selected = ["Equal Opportunity Difference", "False Negative Rate Difference"]
            rejected.append(
                {
                    "metric": "Demographic Parity Difference",
                    "reason": "Selection-rate equality does not directly measure missed qualified individuals.",
                }
            )
        else:
            rule_id = "RULE-FN-NOLABEL-001"
            selected = ["Demographic Parity Difference", "Disparate Impact Ratio"]
            rejected.append(
                {
                    "metric": "Equal Opportunity Difference",
                    "reason": "It requires reliable ground-truth outcomes.",
                }
            )
    elif harm in {"different_error_rates", "errors", "both_error_types"}:
        if not ground_truth_available:
            raise ValueError("Error-rate fairness metrics require reliable ground-truth labels.")
        rule_id = "RULE-ERROR-001"
        selected = [
            "Equalized Odds Difference",
            "Average Odds Difference",
            "False Positive Rate Difference",
            "False Negative Rate Difference",
        ]
    elif harm in {"incorrect_positive_decisions", "false_positives"}:
        if not ground_truth_available:
            raise ValueError("False-positive fairness analysis requires reliable ground-truth labels.")
        rule_id = "RULE-FP-001"
        selected = ["False Positive Rate Difference", "Predictive Parity Difference"]
    elif harm in {"unequal_selection", "unequal_access", "allocation"}:
        rule_id = "RULE-ALLOCATION-001"
        selected = ["Demographic Parity Difference", "Disparate Impact Ratio"]
        if ground_truth_available:
            selected.append("Equalized Odds Difference")
    else:
        rule_id = "RULE-GENERAL-001"
        selected = ["Demographic Parity Difference", "Equalized Odds Difference"] if ground_truth_available else ["Demographic Parity Difference", "Disparate Impact Ratio"]

    interpretation = (
        "A positive decision represents access to a benefit."
        if outcome_is_benefit
        else "A positive decision may represent a burden or adverse outcome; interpret selection rates accordingly."
    )
    return {
        "rule_id": rule_id,
        "rule_version": "1.0.0",
        "recommended_metrics": selected,
        "rejected_metrics": rejected,
        "interpretation_note": interpretation,
        "human_review_required": True,
    }


def _numeric_scaler(name: str):
    scalers = {
        "None": "passthrough",
        "StandardScaler": StandardScaler(),
        "MinMaxScaler": MinMaxScaler(),
        "RobustScaler": RobustScaler(),
        "MaxAbsScaler": MaxAbsScaler(),
    }
    if name not in scalers:
        raise ValueError(f"Unsupported scaler: {name}")
    return scalers[name]


def _build_model(name: str):
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
        "Support Vector Classifier": SVC(probability=True, random_state=RANDOM_STATE),
        "Gradient Descent Classifier": SGDClassifier(loss="log_loss", max_iter=1500, random_state=RANDOM_STATE),
        "Gradient Boosting Classifier": GradientBoostingClassifier(random_state=RANDOM_STATE),
        "Decision Tree Classifier": DecisionTreeClassifier(max_depth=7, random_state=RANDOM_STATE),
        "Random Forest Classifier": RandomForestClassifier(
            n_estimators=180,
            max_depth=10,
            min_samples_leaf=3,
            n_jobs=-1,
            random_state=RANDOM_STATE,
        ),
    }
    if name not in models:
        raise ValueError(f"Unsupported classification model: {name}")
    return models[name]


def _build_pipeline(X: pd.DataFrame, model_name: str, scaler_name: str) -> Pipeline:
    numeric_cols = X.select_dtypes(include=[np.number, "bool"]).columns.tolist()
    categorical_cols = [c for c in X.columns if c not in numeric_cols]

    transformers = []
    if numeric_cols:
        numeric_steps: List[Tuple[str, Any]] = [("imputer", SimpleImputer(strategy="median"))]
        scaler = _numeric_scaler(scaler_name)
        if scaler != "passthrough":
            numeric_steps.append(("scaler", scaler))
        transformers.append(("numeric", Pipeline(numeric_steps), numeric_cols))
    if categorical_cols:
        transformers.append(
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                categorical_cols,
            )
        )
    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")
    return Pipeline([("preprocess", preprocessor), ("model", _build_model(model_name))])


def reweighing_weights(y: np.ndarray, sensitive: np.ndarray) -> np.ndarray:
    """Compute Kamiran & Calders reweighing weights from observed frequencies."""
    n = len(y)
    weights = np.ones(n, dtype=float)
    for group in np.unique(sensitive):
        for label in np.unique(y):
            cell = (sensitive == group) & (y == label)
            observed = int(cell.sum())
            if observed == 0:
                continue
            group_count = int((sensitive == group).sum())
            label_count = int((y == label).sum())
            expected = group_count * label_count / n
            weights[cell] = expected / observed
    return weights


def _safe_rate(numerator: int, denominator: int) -> Optional[float]:
    return float(numerator / denominator) if denominator else None


def group_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, sensitive: np.ndarray) -> Dict[str, Dict[str, Any]]:
    output: Dict[str, Dict[str, Any]] = {}
    for group in sorted(np.unique(sensitive)):
        mask = sensitive == group
        yt = y_true[mask]
        yp = y_pred[mask]
        tp = int(((yt == 1) & (yp == 1)).sum())
        tn = int(((yt == 0) & (yp == 0)).sum())
        fp = int(((yt == 0) & (yp == 1)).sum())
        fn = int(((yt == 1) & (yp == 0)).sum())
        output[str(group)] = {
            "sample_size": int(mask.sum()),
            "actual_positive_rate": round(float(yt.mean()), 6),
            "selection_rate": round(float(yp.mean()), 6),
            "accuracy": round(float((yt == yp).mean()), 6),
            "true_positive_rate": _safe_rate(tp, tp + fn),
            "false_positive_rate": _safe_rate(fp, fp + tn),
            "false_negative_rate": _safe_rate(fn, tp + fn),
            "precision": _safe_rate(tp, tp + fp),
            "confusion_matrix": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        }
    return output


def _range_of(group_metrics: Mapping[str, Mapping[str, Any]], key: str) -> Optional[float]:
    values = [float(v[key]) for v in group_metrics.values() if v.get(key) is not None]
    return max(values) - min(values) if len(values) >= 2 else None


def compute_fairness_metrics(
    group_metrics: Mapping[str, Mapping[str, Any]],
    requested: Iterable[str],
) -> Dict[str, Optional[float]]:
    requested_set = set(requested)
    unknown = requested_set - SUPPORTED_FAIRNESS_METRICS
    if unknown:
        raise ValueError(f"Unsupported fairness metrics: {sorted(unknown)}")

    selection_rates = [float(v["selection_rate"]) for v in group_metrics.values()]
    dp_diff = max(selection_rates) - min(selection_rates) if len(selection_rates) >= 2 else None
    disparate_impact = (
        min(selection_rates) / max(selection_rates)
        if len(selection_rates) >= 2 and max(selection_rates) > 0
        else None
    )
    tpr_diff = _range_of(group_metrics, "true_positive_rate")
    fpr_diff = _range_of(group_metrics, "false_positive_rate")
    fnr_diff = _range_of(group_metrics, "false_negative_rate")
    precision_diff = _range_of(group_metrics, "precision")

    available = {
        "Demographic Parity Difference": dp_diff,
        "Disparate Impact Ratio": disparate_impact,
        "Equal Opportunity Difference": tpr_diff,
        "False Positive Rate Difference": fpr_diff,
        "False Negative Rate Difference": fnr_diff,
        "Equalized Odds Difference": max(tpr_diff, fpr_diff) if tpr_diff is not None and fpr_diff is not None else None,
        "Average Odds Difference": (tpr_diff + fpr_diff) / 2 if tpr_diff is not None and fpr_diff is not None else None,
        "Predictive Parity Difference": precision_diff,
    }
    return {
        name: (round(float(available[name]), 6) if available[name] is not None else None)
        for name in requested_set
    }


def compute_effectiveness_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_score: Optional[np.ndarray],
    requested: Iterable[str],
) -> Dict[str, Optional[float]]:
    requested_set = set(requested)
    unknown = requested_set - SUPPORTED_EFFECTIVENESS_METRICS
    if unknown:
        raise ValueError(f"Unsupported effectiveness metrics: {sorted(unknown)}")
    result: Dict[str, Optional[float]] = {}
    if "Accuracy" in requested_set:
        result["Accuracy"] = float(accuracy_score(y_true, y_pred))
    if "F1" in requested_set:
        result["F1"] = float(f1_score(y_true, y_pred, zero_division=0))
    if "Precision" in requested_set:
        result["Precision"] = float(precision_score(y_true, y_pred, zero_division=0))
    if "Recall" in requested_set:
        result["Recall"] = float(recall_score(y_true, y_pred, zero_division=0))
    if "ROC-AUC" in requested_set:
        result["ROC-AUC"] = float(roc_auc_score(y_true, y_score)) if y_score is not None and len(np.unique(y_true)) == 2 else None
    return {k: (round(v, 6) if v is not None else None) for k, v in result.items()}


def bootstrap_fairness_intervals(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    sensitive: np.ndarray,
    metric_names: Sequence[str],
    *,
    iterations: int = 100,
    seed: int = RANDOM_STATE,
) -> Dict[str, Dict[str, Any]]:
    if iterations <= 0:
        return {}
    rng = np.random.default_rng(seed)
    values: Dict[str, List[float]] = {m: [] for m in metric_names}
    n = len(y_true)
    for _ in range(iterations):
        indices = rng.integers(0, n, n)
        sampled_sensitive = sensitive[indices]
        if len(np.unique(sampled_sensitive)) < 2:
            continue
        gm = group_classification_metrics(y_true[indices], y_pred[indices], sampled_sensitive)
        computed = compute_fairness_metrics(gm, metric_names)
        for name, value in computed.items():
            if value is not None and math.isfinite(value):
                values[name].append(float(value))

    result: Dict[str, Dict[str, Any]] = {}
    for name, vals in values.items():
        if len(vals) >= max(20, iterations // 3):
            result[name] = {
                "lower_95": round(float(np.percentile(vals, 2.5)), 6),
                "upper_95": round(float(np.percentile(vals, 97.5)), 6),
                "successful_iterations": len(vals),
            }
        else:
            result[name] = {
                "lower_95": None,
                "upper_95": None,
                "successful_iterations": len(vals),
                "warning": "Too few valid bootstrap samples for a reliable interval.",
            }
    return result


def _stratification_key(y: np.ndarray, sensitive: np.ndarray) -> np.ndarray:
    joint = np.asarray([f"{label}::{group}" for label, group in zip(y, sensitive)], dtype=object)
    counts = pd.Series(joint).value_counts()
    if len(counts) > 1 and int(counts.min()) >= 2:
        return joint
    return y


def train_combination(
    df: pd.DataFrame,
    *,
    label_column: str,
    positive_label: Any,
    sensitive_attrs: Sequence[str],
    scaler_name: str,
    model_name: str,
    mitigation_method: str,
    effectiveness_metrics: Sequence[str],
    fairness_metrics: Sequence[str],
    test_size: float = 0.25,
    bootstrap_iterations: int = 100,
    exclude_sensitive_from_features: bool = True,
) -> Dict[str, Any]:
    """Train one real model/mitigation combination and return computed evidence."""
    if not 0.1 <= test_size <= 0.5:
        raise ValueError("test_size must be between 0.10 and 0.50.")

    prepared = prepare_binary_data(
        df,
        label_column=label_column,
        positive_label=positive_label,
        sensitive_attrs=sensitive_attrs,
        exclude_sensitive_from_features=exclude_sensitive_from_features,
    )
    indices = np.arange(len(prepared.y))
    train_idx, test_idx = train_test_split(
        indices,
        test_size=test_size,
        random_state=RANDOM_STATE,
        stratify=_stratification_key(prepared.y, prepared.sensitive),
    )
    X_train, X_test = prepared.X.iloc[train_idx], prepared.X.iloc[test_idx]
    y_train, y_test = prepared.y[train_idx], prepared.y[test_idx]
    s_train, s_test = prepared.sensitive[train_idx], prepared.sensitive[test_idx]

    model = _build_pipeline(X_train, model_name, scaler_name)
    method = mitigation_method.strip()
    mitigation_details: Dict[str, Any] = {"method": method, "applied": False}

    if method == "No Method":
        model.fit(X_train, y_train)
    elif method == "Reweighing":
        weights = reweighing_weights(y_train, s_train)
        try:
            model.fit(X_train, y_train, model__sample_weight=weights)
        except TypeError as exc:
            raise ValueError(f"{model_name} does not support sample weights required by Reweighing.") from exc
        mitigation_details.update(
            {
                "applied": True,
                "weight_min": round(float(weights.min()), 6),
                "weight_max": round(float(weights.max()), 6),
            }
        )
    elif method == "Threshold Optimizer (Equalized Odds)":
        if not FAIRLEARN_AVAILABLE:
            raise ValueError("Fairlearn is not installed; Threshold Optimizer cannot be executed.")
        optimizer = ThresholdOptimizer(
            estimator=model,
            constraints="equalized_odds",
            predict_method="predict_proba",
            prefit=False,
        )
        optimizer.fit(X_train, y_train, sensitive_features=s_train)
        model = optimizer  # type: ignore[assignment]
        mitigation_details["applied"] = True
    else:
        raise ValueError(f"Unsupported mitigation method: {method}")

    if FAIRLEARN_AVAILABLE and ThresholdOptimizer is not None and isinstance(model, ThresholdOptimizer):
        y_pred = np.asarray(model.predict(X_test, sensitive_features=s_test), dtype=int)
        y_score = None
    else:
        y_pred = np.asarray(model.predict(X_test), dtype=int)
        y_score = None
        if hasattr(model, "predict_proba"):
            probabilities = np.asarray(model.predict_proba(X_test))
            if probabilities.ndim == 2 and probabilities.shape[1] >= 2:
                y_score = probabilities[:, 1]
        elif hasattr(model, "decision_function"):
            decision = np.asarray(model.decision_function(X_test), dtype=float)
            y_score = 1 / (1 + np.exp(-decision))

    group_metrics = group_classification_metrics(y_test, y_pred, s_test)
    effectiveness = compute_effectiveness_metrics(y_test, y_pred, y_score, effectiveness_metrics)
    fairness = compute_fairness_metrics(group_metrics, fairness_metrics)
    intervals = bootstrap_fairness_intervals(
        y_test,
        y_pred,
        s_test,
        list(fairness_metrics),
        iterations=bootstrap_iterations,
    )

    warnings: List[str] = []
    for group, metrics in group_metrics.items():
        if int(metrics["sample_size"]) < 30:
            warnings.append(f"Test subgroup '{group}' has only {metrics['sample_size']} records.")
        if metrics["true_positive_rate"] is None:
            warnings.append(f"True-positive rate is undefined for subgroup '{group}' because it has no actual positives.")
        if metrics["false_positive_rate"] is None:
            warnings.append(f"False-positive rate is undefined for subgroup '{group}' because it has no actual negatives.")

    return {
        "model": model_name,
        "mitigation": mitigation_details,
        "test_size": int(len(test_idx)),
        "sensitive_group_definition": prepared.sensitive_name,
        "effectiveness_metrics": effectiveness,
        "fairness_metrics": fairness,
        "group_metrics": group_metrics,
        "confidence_intervals": intervals,
        "warnings": warnings,
        "result_provenance": {
            "random_state": RANDOM_STATE,
            "exclude_sensitive_from_features": exclude_sensitive_from_features,
            "metrics_are_computed": True,
            "mock_values_used": False,
        },
    }


def normalize_metric(name: str, value: Optional[float]) -> Optional[float]:
    if value is None or not math.isfinite(float(value)):
        return None
    value = float(value)
    if name in SUPPORTED_EFFECTIVENESS_METRICS:
        return max(0.0, min(1.0, value))
    if name in DIFFERENCE_METRICS:
        return max(0.0, 1.0 - min(1.0, abs(value)))
    if name == "Disparate Impact Ratio":
        return max(0.0, 1.0 - abs(1.0 - value))
    return None


def tradeoff_score(result: Mapping[str, Any], weights: Mapping[str, float]) -> Optional[float]:
    all_metrics = {**result["effectiveness_metrics"], **result["fairness_metrics"]}
    values: List[Tuple[float, float]] = []
    for name, weight in weights.items():
        normalized = normalize_metric(name, all_metrics.get(name))
        if normalized is not None and weight > 0:
            values.append((normalized, float(weight)))
    if not values:
        return None
    denominator = sum(weight for _, weight in values)
    return round(sum(score * weight for score, weight in values) / denominator, 6)
