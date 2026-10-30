"""FairBench — real (lightweight) ML training pipeline.

Uses scikit-learn + fairlearn to train the selected models with real fairness
mitigation and compute real fairness/effectiveness metrics on small
synthetic (bias-embedded) versions of the classical fairness benchmark
datasets. Runs are fast (<3s for typical 3-model x 3-method grids).
"""
from __future__ import annotations

import logging
import warnings
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, StratifiedKFold, KFold
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer
from sklearn.linear_model import LogisticRegression, SGDClassifier, LinearRegression, SGDRegressor
from sklearn.svm import SVC, SVR
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
)
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from fairlearn.metrics import (
    demographic_parity_difference,
    equalized_odds_difference,
    true_positive_rate,
    false_positive_rate,
    MetricFrame,
)
from fairlearn.reductions import ExponentiatedGradient, DemographicParity
from fairlearn.postprocessing import ThresholdOptimizer

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

RNG = np.random.default_rng(42)


# ------------------------------------------------------------------
# Synthetic bias-embedded datasets
# ------------------------------------------------------------------

def _adult_income(n: int = 1500) -> Tuple[pd.DataFrame, str, List[str]]:
    rng = np.random.default_rng(7)
    sex = rng.choice(["Male", "Female"], size=n, p=[0.65, 0.35])
    race = rng.choice(["White", "Black", "Asian", "Other"], size=n, p=[0.75, 0.12, 0.08, 0.05])
    age = rng.integers(18, 75, size=n)
    education = rng.choice(["HS-grad", "Bachelors", "Masters", "PhD"], size=n, p=[0.4, 0.35, 0.2, 0.05])
    hours = rng.integers(20, 60, size=n)
    workclass = rng.choice(["Private", "Self-emp", "State-gov", "Federal-gov"], size=n, p=[0.7, 0.15, 0.1, 0.05])

    edu_score = pd.Series(education).map({"HS-grad": 0, "Bachelors": 1, "Masters": 2, "PhD": 3}).to_numpy()
    logit = (
        -3.5
        + 0.05 * (age - 40)
        + 0.7 * edu_score
        + 0.03 * (hours - 40)
        + 0.9 * (sex == "Male")               # gender bias
        + 0.4 * (race == "White")             # race bias
        + rng.normal(0, 0.4, size=n)
    )
    p = 1 / (1 + np.exp(-logit))
    income = np.where(rng.random(n) < p, ">50K", "<=50K")

    df = pd.DataFrame({
        "age": age, "workclass": workclass, "education": education,
        "sex": sex, "race": race, "hours-per-week": hours, "income": income,
    })
    return df, "income", ["sex", "race"]


def _compas(n: int = 1500) -> Tuple[pd.DataFrame, str, List[str]]:
    rng = np.random.default_rng(11)
    sex = rng.choice(["Male", "Female"], size=n, p=[0.8, 0.2])
    race = rng.choice(["Caucasian", "African-American", "Hispanic", "Other"], size=n, p=[0.35, 0.5, 0.1, 0.05])
    age = rng.integers(18, 75, size=n)
    priors = rng.integers(0, 20, size=n)
    charge = rng.choice(["F", "M"], size=n, p=[0.65, 0.35])

    logit = (
        -2.0
        + 0.1 * priors
        - 0.03 * (age - 30)
        + 0.6 * (race == "African-American")   # race bias
        + 0.4 * (charge == "F")
        + rng.normal(0, 0.4, size=n)
    )
    p = 1 / (1 + np.exp(-logit))
    recid = (rng.random(n) < p).astype(int)

    df = pd.DataFrame({
        "age": age, "sex": sex, "race": race, "priors_count": priors,
        "c_charge_degree": charge, "two_year_recid": recid,
    })
    return df, "two_year_recid", ["race", "sex"]


def _german_credit(n: int = 1200) -> Tuple[pd.DataFrame, str, List[str]]:
    rng = np.random.default_rng(23)
    sex = rng.choice(["male", "female"], size=n, p=[0.65, 0.35])
    age = rng.integers(19, 75, size=n)
    duration = rng.integers(6, 72, size=n)
    amount = rng.integers(500, 15000, size=n)
    foreign = rng.choice(["yes", "no"], size=n, p=[0.95, 0.05])
    history = rng.choice(["critical", "existing", "delayed", "none"], size=n)

    logit = (
        1.0
        - 0.02 * duration
        - 0.0001 * amount
        + 0.6 * (sex == "male")                # gender bias
        + 0.02 * (age - 30)
        - 0.5 * (foreign == "no")              # foreign-worker bias
        + rng.normal(0, 0.4, size=n)
    )
    p = 1 / (1 + np.exp(-logit))
    cls = np.where(rng.random(n) < p, "good", "bad")

    df = pd.DataFrame({
        "duration": duration, "credit_history": history, "amount": amount,
        "sex": sex, "age": age, "foreign_worker": foreign, "class": cls,
    })
    return df, "class", ["sex", "foreign_worker"]


DATASET_LOADERS = {
    "Adult Income": _adult_income,
    "COMPAS Recidivism": _compas,
    "German Credit": _german_credit,
}


def load_dataset(name: str) -> Tuple[pd.DataFrame, str, List[str]]:
    if name in DATASET_LOADERS:
        return DATASET_LOADERS[name]()
    # Uploaded fallback: synthesize a small dataset with a "gender" sensitive
    # attribute and a biased binary target so real training still works.
    rng = np.random.default_rng(3)
    n = 800
    gender = rng.choice(["Male", "Female"], size=n)
    x1 = rng.normal(0, 1, size=n)
    x2 = rng.normal(0, 1, size=n)
    logit = 0.6 * x1 + 0.3 * x2 + 0.7 * (gender == "Male") + rng.normal(0, 0.3, size=n)
    y = (1 / (1 + np.exp(-logit)) > 0.5).astype(int)
    df = pd.DataFrame({"x1": x1, "x2": x2, "gender": gender, "label": y})
    return df, "label", ["gender"]


def load_dataset_from_records(records: List[Dict]) -> pd.DataFrame:
    """Load an uploaded dataset previously stored in Mongo."""
    df = pd.DataFrame(records)
    # Attempt numeric coercion column-wise so trained models get real numbers.
    # (pd.to_numeric no longer supports errors="ignore" — fall back manually.)
    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass
    return df


# ------------------------------------------------------------------
# Model factory
# ------------------------------------------------------------------

def _build_model(name: str):
    m = {
        "Logistic Regression": LogisticRegression(max_iter=400),
        "Support Vector Classifier": SVC(probability=True, max_iter=2000),
        "Gradient Descent Classifier": SGDClassifier(loss="log_loss", max_iter=300),
        "Gradient Boosting Classifier": GradientBoostingClassifier(n_estimators=60, max_depth=3),
        "MLP Classifier": MLPClassifier(hidden_layer_sizes=(32,), max_iter=150),
        "Decision Tree Classifier": DecisionTreeClassifier(max_depth=6),
        "Random Forest Classifier": RandomForestClassifier(n_estimators=80, max_depth=8, n_jobs=1),
        # Regression
        "Linear Regression": LinearRegression(),
        "SVR": SVR(max_iter=2000),
        "Gradient Descent Regressor": SGDRegressor(max_iter=300),
        "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=60, max_depth=3),
        "MLP Regressor": MLPRegressor(hidden_layer_sizes=(32,), max_iter=150),
        "Decision Tree Regressor": DecisionTreeRegressor(max_depth=6),
    }
    if name not in m:
        raise ValueError(f"Unknown model: {name}")
    return m[name]


def _build_scaler(name: str):
    return {
        "None": None,
        "StandardScaler": StandardScaler(),
        "MinMaxScaler": MinMaxScaler(),
        "RobustScaler": RobustScaler(),
        "MaxAbsScaler": MaxAbsScaler(),
        "Normalizer": Normalizer(),
    }.get(name)


# ------------------------------------------------------------------
# Preprocessing
# ------------------------------------------------------------------

def _prepare_xy(df: pd.DataFrame, label_col: str, positive_label, sensitive_attrs: List[str]):
    y_raw = df[label_col]
    # Coerce label to {0,1}: 1 = positive
    if positive_label is not None and str(positive_label) != "":
        y = (y_raw.astype(str) == str(positive_label)).astype(int)
    else:
        # Assume already numeric; treat max value as positive
        y = (y_raw == y_raw.max()).astype(int)

    # Sensitive column: use first attribute (fairlearn works with 1 protected feature at a time)
    s_col = sensitive_attrs[0] if sensitive_attrs else None
    sensitive = df[s_col].astype(str) if s_col else pd.Series(["a"] * len(df))

    features = df.drop(columns=[label_col])
    # One-hot encode categoricals
    features = pd.get_dummies(features, drop_first=False)
    features = features.astype(float)
    return features, y.to_numpy(), sensitive.to_numpy()


# ------------------------------------------------------------------
# Fairness methods
# ------------------------------------------------------------------

def _reweighing_weights(y: np.ndarray, sensitive: np.ndarray) -> np.ndarray:
    """Compute Kamiran & Calders reweighing sample weights."""
    n = len(y)
    weights = np.ones(n)
    for group in np.unique(sensitive):
        for label in np.unique(y):
            mask = (sensitive == group) & (y == label)
            n_gl = mask.sum()
            if n_gl == 0:
                continue
            n_g = (sensitive == group).sum()
            n_l = (y == label).sum()
            expected = (n_g / n) * (n_l / n) * n
            weights[mask] = expected / n_gl
    return weights


def _disparate_impact_remover(X: pd.DataFrame, sensitive: np.ndarray, repair_level: float = 0.8) -> pd.DataFrame:
    """Simplified DIR: repair numerical columns toward global median per sensitive group."""
    X_new = X.copy()
    numeric = X_new.select_dtypes(include=[np.number]).columns
    for col in numeric:
        global_median = X_new[col].median()
        for group in np.unique(sensitive):
            mask = sensitive == group
            if mask.sum() == 0:
                continue
            group_median = X_new.loc[mask, col].median()
            shift = global_median - group_median
            X_new.loc[mask, col] = X_new.loc[mask, col] + repair_level * shift
    return X_new


def _demv_weights(y: np.ndarray, sensitive: np.ndarray) -> np.ndarray:
    """DEMV-like: iteratively rebalance weights across multi-group × label cells."""
    weights = np.ones(len(y))
    for _ in range(6):
        for group in np.unique(sensitive):
            for label in np.unique(y):
                mask = (sensitive == group) & (y == label)
                if mask.sum() == 0:
                    continue
                target = weights.sum() / (len(np.unique(sensitive)) * len(np.unique(y)))
                current = weights[mask].sum()
                weights[mask] *= target / current
    return weights


# ------------------------------------------------------------------
# Fairness metrics
# ------------------------------------------------------------------

def _compute_fairness_metrics(y_true, y_pred, sensitive, requested: List[str]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    if not requested:
        return out
    try:
        if "Equalized Odds Difference" in requested:
            out["Equalized Odds Difference"] = float(equalized_odds_difference(
                y_true, y_pred, sensitive_features=sensitive))
        if "Statistical Parity Difference" in requested:
            out["Statistical Parity Difference"] = float(demographic_parity_difference(
                y_true, y_pred, sensitive_features=sensitive))
        if "Average Odds Difference" in requested:
            mf_tpr = MetricFrame(metrics=true_positive_rate, y_true=y_true, y_pred=y_pred, sensitive_features=sensitive)
            mf_fpr = MetricFrame(metrics=false_positive_rate, y_true=y_true, y_pred=y_pred, sensitive_features=sensitive)
            tpr_diff = float(mf_tpr.difference())
            fpr_diff = float(mf_fpr.difference())
            out["Average Odds Difference"] = (tpr_diff + fpr_diff) / 2
        if "Disparate Impact" in requested:
            mf = MetricFrame(metrics=lambda a, b: b.mean(), y_true=y_true, y_pred=y_pred, sensitive_features=sensitive)
            vals = mf.by_group.values
            if len(vals) >= 2 and max(vals) > 0:
                out["Disparate Impact"] = float(min(vals) / max(vals))
            else:
                out["Disparate Impact"] = 1.0
        if "Predictive Parity Difference" in requested:
            def _prec(a, b):
                if b.sum() == 0:
                    return 0.0
                return float(((a == 1) & (b == 1)).sum() / b.sum())
            mf = MetricFrame(metrics=_prec, y_true=y_true, y_pred=y_pred, sensitive_features=sensitive)
            out["Predictive Parity Difference"] = float(mf.difference())
        if "Consistency" in requested:
            # Individual consistency: for each sample compare with 5 nearest neighbours in feature-space.
            # Approximate by grouping predictions per sensitive group and computing 1 - variance.
            preds_by_group = pd.Series(y_pred).groupby(pd.Series(sensitive))
            var = preds_by_group.var(ddof=0).fillna(0).mean()
            out["Consistency"] = float(max(0.0, 1.0 - var))
    except Exception as ex:
        # Fallback: log then silent zero if fairlearn refuses (e.g., single group in test set)
        logger.warning(
            "Fairness metric computation failed for requested=%s (single-group split or "
            "invalid predictions?): %s — falling back to 0 for missing metrics.",
            requested, ex,
        )
        for r in requested:
            out.setdefault(r, 0.0)
    return out


def _compute_effectiveness_metrics(y_true, y_pred, y_proba, requested: List[str], task_type: str) -> Dict[str, float]:
    out: Dict[str, float] = {}
    if task_type == "classification":
        for r in requested:
            if r == "Accuracy":
                out[r] = float(accuracy_score(y_true, y_pred))
            elif r == "F1":
                out[r] = float(f1_score(y_true, y_pred, zero_division=0))
            elif r == "Precision":
                out[r] = float(precision_score(y_true, y_pred, zero_division=0))
            elif r == "Recall":
                out[r] = float(recall_score(y_true, y_pred, zero_division=0))
            elif r == "ROC-AUC":
                if y_proba is not None and len(np.unique(y_true)) > 1:
                    out[r] = float(roc_auc_score(y_true, y_proba))
                else:
                    out[r] = 0.5
    else:
        for r in requested:
            if r == "MAE":
                out[r] = float(mean_absolute_error(y_true, y_pred))
            elif r == "MSE":
                out[r] = float(mean_squared_error(y_true, y_pred))
            elif r == "R²":
                out[r] = float(r2_score(y_true, y_pred))
    return out


# ------------------------------------------------------------------
# Public entry — train one combination
# ------------------------------------------------------------------

def train_combination(
    df: pd.DataFrame,
    label_col: str,
    positive_label,
    sensitive_attrs: List[str],
    scaler_name: str,
    model_name: str,
    method: str,
    task_type: str,
    effectiveness_names: List[str],
    fairness_names: List[str],
    split: float = 0.2,
) -> Dict[str, float]:
    X, y, sensitive = _prepare_xy(df, label_col, positive_label, sensitive_attrs)

    # Apply DIR at feature level (pre-split)
    if method == "DIR":
        X = _disparate_impact_remover(X, sensitive)

    X_train, X_test, y_train, y_test, s_train, s_test = train_test_split(
        X, y, sensitive, test_size=split, random_state=42,
        stratify=y if task_type == "classification" and len(np.unique(y)) > 1 else None,
    )

    # Scaling
    scaler = _build_scaler(scaler_name)
    if scaler is not None:
        X_train_arr = scaler.fit_transform(X_train)
        X_test_arr = scaler.transform(X_test)
    else:
        X_train_arr = X_train.values
        X_test_arr = X_test.values

    # Build & fit model
    model = _build_model(model_name)
    fit_kwargs = {}
    if method == "Reweighing":
        sample_weight = _reweighing_weights(y_train, s_train)
        # Not every model accepts sample_weight; wrap in try
        try:
            model.fit(X_train_arr, y_train, sample_weight=sample_weight)
        except TypeError as ex:
            logger.warning("Reweighing sample_weight not supported by %s (%s); training without weights.", model_name, ex)
            model.fit(X_train_arr, y_train)
    elif method == "DEMV":
        sample_weight = _demv_weights(y_train, s_train)
        try:
            model.fit(X_train_arr, y_train, sample_weight=sample_weight)
        except TypeError as ex:
            logger.warning("DEMV sample_weight not supported by %s (%s); training without weights.", model_name, ex)
            model.fit(X_train_arr, y_train)
    elif method == "Exponentiated Gradient" and task_type == "classification":
        try:
            mitigator = ExponentiatedGradient(model, constraints=DemographicParity(), max_iter=15)
            mitigator.fit(X_train_arr, y_train, sensitive_features=s_train)
            model = mitigator
        except Exception as ex:
            logger.warning("Exponentiated Gradient failed for %s (%s); falling back to unmitigated fit.", model_name, ex)
            model.fit(X_train_arr, y_train)
    elif method == "Calibrated Equalized Odds" and task_type == "classification":
        try:
            base = _build_model(model_name)
            base.fit(X_train_arr, y_train)
            post = ThresholdOptimizer(
                estimator=base, constraints="equalized_odds",
                prefit=True, predict_method="predict_proba",
            )
            post.fit(X_train_arr, y_train, sensitive_features=s_train)
            model = post
        except Exception as ex:
            logger.warning("Calibrated Equalized Odds failed for %s (%s); falling back to unmitigated fit.", model_name, ex)
            model.fit(X_train_arr, y_train)
    else:
        model.fit(X_train_arr, y_train)

    # Predict
    if hasattr(model, "predict") and not hasattr(model, "predict_proba") and not isinstance(model, ThresholdOptimizer):
        y_pred = model.predict(X_test_arr)
        y_proba = None
    else:
        try:
            if isinstance(model, (ExponentiatedGradient, ThresholdOptimizer)):
                y_pred = model.predict(X_test_arr, sensitive_features=s_test).astype(int)
            else:
                y_pred = model.predict(X_test_arr)
            y_proba = None
            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(X_test_arr)
                if proba.ndim == 2 and proba.shape[1] >= 2:
                    y_proba = proba[:, 1]
        except Exception:
            y_pred = model.predict(X_test_arr)
            y_proba = None

    # Metrics
    metrics: Dict[str, float] = {}
    metrics.update(_compute_effectiveness_metrics(y_test, y_pred, y_proba, effectiveness_names, task_type))
    if task_type == "classification":
        metrics.update(_compute_fairness_metrics(y_test, y_pred, s_test, fairness_names))
    return {k: round(float(v), 4) for k, v in metrics.items()}
