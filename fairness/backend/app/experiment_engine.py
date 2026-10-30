"""Deterministic, fold-safe training and evaluation for MANILA experiments."""

import os
import time
from datetime import datetime, timezone
from importlib.metadata import PackageNotFoundError, version

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import AdaBoostClassifier, ExtraTreesClassifier, ExtraTreesRegressor, GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, SGDClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score, make_scorer, mean_absolute_error, precision_score, r2_score, recall_score, roc_auc_score
from sklearn.model_selection import KFold, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import MaxAbsScaler, MinMaxScaler, Normalizer, OneHotEncoder, RobustScaler, StandardScaler
from sklearn.svm import LinearSVC, SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier

from app.evaluation import binary_fairness_metrics
from model_registry import MODEL_REGISTRY
from dataset_profiler import profile_dataset


MODEL_FACTORIES = {
    "logistic_regression": lambda seed: LogisticRegression(max_iter=1000, random_state=seed),
    "random_forest_classifier": lambda seed: RandomForestClassifier(n_estimators=200, random_state=seed, n_jobs=1),
    "extra_trees_classifier": lambda seed: ExtraTreesClassifier(n_estimators=200, random_state=seed, n_jobs=1),
    "linear_svc": lambda seed: LinearSVC(random_state=seed, max_iter=5000),
    "support_vector_classifier": lambda seed: SVC(probability=True, random_state=seed),
    "sgd_classifier": lambda seed: SGDClassifier(random_state=seed, max_iter=2000, tol=1e-3),
    "gradient_boosting_classifier": lambda seed: GradientBoostingClassifier(random_state=seed),
    "mlp_classifier": lambda seed: MLPClassifier(random_state=seed, max_iter=500),
    "decision_tree_classifier": lambda seed: DecisionTreeClassifier(random_state=seed),
    "knn_classifier": lambda seed: KNeighborsClassifier(n_neighbors=5),
    "gaussian_nb": lambda seed: GaussianNB(),
    "adaboost_classifier": lambda seed: AdaBoostClassifier(random_state=seed),
    "random_forest_regressor": lambda seed: RandomForestRegressor(n_estimators=200, random_state=seed, n_jobs=1),
    "linear_regression": lambda seed: LinearRegression(),
    "ridge_regression": lambda seed: Ridge(),
    "gradient_boosting_regressor": lambda seed: GradientBoostingRegressor(random_state=seed),
    "extra_trees_regressor": lambda seed: ExtraTreesRegressor(n_estimators=200, random_state=seed, n_jobs=1),
}

FAIRNESS_METHODS = {
    "none": "No mitigation",
    "reweighing": "Reweighing",
    "exponentiated_gradient_dp": "Exponentiated Gradient · Demographic Parity",
    "exponentiated_gradient_eo": "Exponentiated Gradient · Equalized Odds",
    "exponentiated_gradient_tpr": "Exponentiated Gradient · Equal Opportunity",
    "threshold_optimizer_eo": "Threshold Optimizer · Equalized Odds",
    "threshold_optimizer_dp": "Threshold Optimizer · Demographic Parity",
    "threshold_optimizer_tpr": "Threshold Optimizer · Equal Opportunity",
    "threshold_optimizer_fpr": "Threshold Optimizer · False Positive Rate Parity",
    "threshold_optimizer_fnr": "Threshold Optimizer · False Negative Rate Parity",
}


class FairnessLabelAdapter:
    """Keep Fairlearn's internal 0/1 coding transparent in the saved predictor."""

    def __init__(self, estimator, negative_label, positive_label, method, sensitive_features, random_seed):
        self.estimator = estimator
        self.negative_label = negative_label
        self.positive_label = positive_label
        self.method = method
        self.sensitive_features = sensitive_features
        self.random_seed = random_seed

    def predict(self, X, **kwargs):
        if self.method.startswith("threshold_optimizer"):
            groups = kwargs.pop("sensitive_features", _group_labels(X, self.sensitive_features))
            encoded = np.asarray(self.estimator.predict(X, sensitive_features=groups, random_state=self.random_seed, **kwargs))
        else:
            encoded = np.asarray(self.estimator.predict(X, random_state=self.random_seed, **kwargs))
        return np.where(encoded == 1, self.positive_label, self.negative_label)


def _group_labels(frame: pd.DataFrame, columns: list[str]) -> pd.Series:
    return frame[columns].fillna("<missing>").astype(str).agg(" | ".join, axis=1)


def _reweighing_weights(y: pd.Series, groups: pd.Series) -> np.ndarray:
    joint = pd.DataFrame({"y": y.to_numpy(), "group": groups.to_numpy()})
    group_rate = joint["group"].value_counts(normalize=True)
    label_rate = joint["y"].value_counts(normalize=True)
    joint_rate = joint.groupby(["group", "y"], dropna=False).size() / len(joint)
    weights = [group_rate[group] * label_rate[label] / joint_rate[(group, label)] for group, label in zip(joint["group"], joint["y"])]
    return np.asarray(weights, dtype=float)


def _fit_candidate(X, y, groups, model_name, method, scaler, seed, positive_value):
    pipeline = _build_pipeline(X, model_name, scaler, seed)
    if method == "none":
        pipeline.fit(X, y)
        return pipeline
    if method == "reweighing":
        pipeline.fit(X, y, model__sample_weight=_reweighing_weights(y, groups))
        return pipeline
    if method in ("exponentiated_gradient_dp", "exponentiated_gradient_eo", "exponentiated_gradient_tpr"):
        try:
            from fairlearn.reductions import DemographicParity, EqualizedOdds, ExponentiatedGradient, TruePositiveRateParity
        except ImportError as error:
            raise ValueError("Install backend/requirements.txt to enable Fairlearn mitigation methods.") from error
        constraint = {"exponentiated_gradient_dp": DemographicParity, "exponentiated_gradient_eo": EqualizedOdds, "exponentiated_gradient_tpr": TruePositiveRateParity}[method]()
        candidate = ExponentiatedGradient(pipeline, constraints=constraint, sample_weight_name="model__sample_weight", max_iter=50)
        encoded_y = (y == positive_value).astype(int)
        candidate.fit(X, encoded_y, sensitive_features=groups)
        return candidate
    if method.startswith("threshold_optimizer"):
        try:
            from fairlearn.postprocessing import ThresholdOptimizer
        except ImportError as error:
            raise ValueError("Install backend/requirements.txt to enable Fairlearn mitigation methods.") from error
        constraint = {"threshold_optimizer_dp": "demographic_parity", "threshold_optimizer_eo": "equalized_odds", "threshold_optimizer_tpr": "true_positive_rate_parity", "threshold_optimizer_fpr": "false_positive_rate_parity", "threshold_optimizer_fnr": "false_negative_rate_parity"}[method]
        candidate = ThresholdOptimizer(estimator=pipeline, constraints=constraint, objective="balanced_accuracy_score", prefit=False, predict_method="auto", grid_size=100)
        encoded_y = (y == positive_value).astype(int)
        candidate.fit(X, encoded_y, sensitive_features=groups)
        return candidate
    raise ValueError(f"Unknown fairness method: {method}.")


def _predict_candidate(candidate, X, groups, method, seed, positive_value, negative_value):
    response_scores = None
    if method.startswith("threshold_optimizer"):
        predictions = candidate.predict(X, sensitive_features=groups, random_state=seed)
        estimator = candidate.estimator_
    elif method.startswith("exponentiated_gradient"):
        predictions = candidate.predict(X, random_state=seed)
        # ExponentiatedGradient predicts from a weighted mixture of fitted
        # classifiers. Its expected positive prediction is a valid ranking
        # score for ROC-AUC; using the unmitigated base estimator here would
        # silently score a different model.
        mixture = [np.asarray(predictor.predict(X), dtype=float) for predictor in candidate.predictors_]
        response_scores = np.average(mixture, axis=0, weights=np.asarray(candidate.weights_, dtype=float))
        estimator = None
    else:
        predictions = candidate.predict(X)
        estimator = candidate
    if method.startswith("exponentiated_gradient") or method.startswith("threshold_optimizer"):
        predictions = np.where(np.asarray(predictions) == 1, positive_value, negative_value)
    if method.startswith("exponentiated_gradient"):
        pass
    elif estimator is not None and hasattr(estimator, "predict_proba"):
        response_scores = estimator.predict_proba(X)
    elif estimator is not None and hasattr(estimator, "decision_function"):
        response_scores = estimator.decision_function(X)
    return predictions, response_scores


def _build_pipeline(frame: pd.DataFrame, model_name: str, scaler_name: str, seed: int) -> Pipeline:
    numeric_columns = frame.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_columns = [column for column in frame.columns if column not in numeric_columns]
    numeric_steps = [("impute", SimpleImputer(strategy="median", keep_empty_features=True))]
    if scaler_name == "standard":
        numeric_steps.append(("scale", StandardScaler()))
    elif scaler_name == "minmax":
        numeric_steps.append(("scale", MinMaxScaler()))
    elif scaler_name == "robust":
        numeric_steps.append(("scale", RobustScaler()))
    elif scaler_name == "maxabs":
        numeric_steps.append(("scale", MaxAbsScaler()))
    elif scaler_name == "normalize":
        numeric_steps.append(("scale", Normalizer()))
    numeric_pipeline = Pipeline(numeric_steps)
    categorical_pipeline = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent", keep_empty_features=True)),
        ("encode", OneHotEncoder(handle_unknown="ignore")),
    ])
    transformers = []
    if numeric_columns:
        transformers.append(("numeric", numeric_pipeline, numeric_columns))
    if categorical_columns:
        transformers.append(("categorical", categorical_pipeline, categorical_columns))
    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")
    model = MODEL_FACTORIES[model_name](seed)
    return Pipeline([("preprocess", preprocessor), ("model", model)])


def _scoring(task_type: str, metrics: list[str]) -> dict:
    if task_type == "classification":
        scorers = {
            "accuracy": "accuracy",
            "balanced_accuracy": "balanced_accuracy",
            "f1_macro": "f1_macro",
            "precision_macro": make_scorer(precision_score, average="macro", zero_division=0),
            "recall_macro": make_scorer(recall_score, average="macro", zero_division=0),
            "roc_auc": make_scorer(_roc_auc_from_scores, response_method=("predict_proba", "decision_function")),
        }
    else:
        scorers = {
            "r2": "r2",
            "mean_absolute_error": make_scorer(mean_absolute_error, greater_is_better=False),
        }
    return {metric: scorers[metric] for metric in metrics}


def _roc_auc_from_scores(y_true, y_scores) -> float:
    scores = np.asarray(y_scores)
    classes = np.unique(y_true)
    if len(classes) == 2:
        if scores.ndim > 1:
            scores = scores[:, -1]
        return float(roc_auc_score(y_true, scores))
    return float(roc_auc_score(y_true, scores, multi_class="ovr", average="macro"))


def run_experiment(config: dict, output_dir: str, progress_callback=None) -> dict:
    started_clock = time.perf_counter()
    started_at = datetime.now(timezone.utc).isoformat()
    if isinstance(config, dict):
        config = dict(config)
        config.setdefault("fairness_methods", [])
        config.setdefault("metric_weights", {})
    required = {"dataset_path", "target_column", "feature_columns", "task_type", "preprocessing", "validation", "random_seed", "models", "metrics", "fairness_metrics", "fairness_methods", "sensitive_features", "positive_value"}
    if not isinstance(config, dict) or required - config.keys():
        raise ValueError("Experiment configuration is incomplete.")
    dataset_path = config["dataset_path"]
    if not isinstance(dataset_path, str) or not os.path.isfile(dataset_path):
        raise ValueError("Experiment dataset is unavailable.")
    frame = pd.read_csv(dataset_path)
    target, features, task = config["target_column"], config["feature_columns"], config["task_type"]
    if target not in frame or not isinstance(features, list) or not features or target in features or any(column not in frame for column in features):
        raise ValueError("Experiment feature or target columns are invalid.")
    models, methods = config["models"], config["fairness_methods"]
    methods = ["none", *[method for method in methods if method != "none"]]
    if any(model not in MODEL_FACTORIES for model in models) or not models:
        raise ValueError("Experiment contains an unknown or empty model selection.")
    if any(method not in FAIRNESS_METHODS for method in methods):
        raise ValueError("Experiment contains an unknown fairness mitigation method.")
    if profile_dataset(frame, target)["task_type"] != task:
        raise ValueError(f"Task type does not match the values in target column '{target}'.")
    if any(task not in MODEL_REGISTRY[model]["tasks"] for model in models):
        raise ValueError("One or more selected models do not support the configured task type.")
    sensitive_features = config["sensitive_features"]
    binary = task == "classification" and frame[target].nunique(dropna=True) == 2
    if any(method != "none" for method in methods) and (not binary or not sensitive_features):
        raise ValueError("Bias mitigation requires binary classification and at least one sensitive feature.")
    for method in methods:
        if method.startswith("exponentiated_gradient") or method == "reweighing":
            if any(not MODEL_REGISTRY[model].get("supports_sample_weight") for model in models):
                raise ValueError("The selected model does not support sample weights required by this mitigation method.")
        if method.startswith("threshold_optimizer") and any(not MODEL_REGISTRY[model].get("supports_score") for model in models):
            raise ValueError("The selected model cannot provide the scores required by threshold optimization.")
    validation = config["validation"]
    strategy, folds, seed = validation["strategy"], validation["folds"], config["random_seed"]
    if strategy not in ({"train_test_split", "kfold", "stratified_kfold"} if task == "classification" else {"train_test_split", "kfold"}):
        raise ValueError("Experiment validation strategy is not supported for this task type.")
    if isinstance(folds, bool) or not 2 <= folds <= 20 or isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed <= 2**32 - 1:
        raise ValueError("Experiment validation settings are invalid.")
    test_size = validation.get("test_size", 0.2)
    if isinstance(test_size, bool) or not isinstance(test_size, (int, float)) or not 0.1 <= test_size <= 0.5:
        raise ValueError("Train/test split size must be between 10% and 50%.")
    scaler = config["preprocessing"].get("scaler")
    if scaler not in ("standard", "minmax", "robust", "maxabs", "normalize", "none"):
        raise ValueError("Experiment preprocessing settings are invalid.")
    os.makedirs(output_dir, exist_ok=True)
    rows_before = len(frame)
    frame = frame.dropna(subset=[target]).reset_index(drop=True)
    if task == "regression":
        numeric = pd.to_numeric(frame[target], errors="coerce")
        frame = frame.loc[np.isfinite(numeric.to_numpy(dtype=float, na_value=np.nan))].reset_index(drop=True)
    if frame.empty:
        raise ValueError(f"Target column '{target}' has no usable rows.")
    X, y = frame[features].replace([np.inf, -np.inf], np.nan), frame[target]
    if task == "regression":
        y = pd.to_numeric(y, errors="coerce")
    if strategy == "train_test_split":
        indices = np.arange(len(frame))
        train_idx, test_idx = train_test_split(indices, test_size=test_size, random_state=seed, shuffle=True, stratify=y if task == "classification" else None)
        splits = [(train_idx, test_idx)]
    else:
        splitter = StratifiedKFold(folds, shuffle=True, random_state=seed) if task == "classification" and strategy == "stratified_kfold" else KFold(folds, shuffle=True, random_state=seed)
        if task == "classification" and y.value_counts().min() < folds:
            raise ValueError(f"Each target class needs at least {folds} rows for {folds}-fold cross-validation.")
        splits = list(splitter.split(X, y))
    all_sensitive = _group_labels(frame, sensitive_features) if sensitive_features else pd.Series("all", index=frame.index)
    metric_ids = config["metrics"]
    run_specs = [(model, method) for model in models for method in methods]
    results, fitted = [], {}
    for index, (model_name, method) in enumerate(run_specs, start=1):
        evaluation_started = time.perf_counter()
        y_true_parts, prediction_parts, score_parts = [], [], []
        values = {metric: [] for metric in metric_ids}
        for train_idx, test_idx in splits:
            train_groups, test_groups = all_sensitive.iloc[train_idx], all_sensitive.iloc[test_idx]
            positive = config["positive_value"] if config["positive_value"] is not None else y.drop_duplicates().iloc[-1]
            negative = next(value for value in y.drop_duplicates().tolist() if value != positive)
            estimator = _fit_candidate(X.iloc[train_idx], y.iloc[train_idx], train_groups, model_name, method, scaler, seed, positive)
            pred, response_scores = _predict_candidate(estimator, X.iloc[test_idx], test_groups, method, seed, positive, negative)
            if "roc_auc" in metric_ids and response_scores is None:
                score_model = _build_pipeline(X.iloc[train_idx], model_name, scaler, seed).fit(X.iloc[train_idx], y.iloc[train_idx])
                if hasattr(score_model, "predict_proba"):
                    response_scores = score_model.predict_proba(X.iloc[test_idx])
                elif hasattr(score_model, "decision_function"):
                    response_scores = score_model.decision_function(X.iloc[test_idx])
            truth = y.iloc[test_idx]
            y_true_parts.append(truth.to_numpy())
            prediction_parts.append(np.asarray(pred))
            if "roc_auc" in metric_ids:
                if response_scores is None:
                    raise ValueError(f"{MODEL_REGISTRY[model_name]['label']} cannot produce scores required for ROC-AUC.")
                score_parts.append(np.asarray(response_scores))
            for metric in metric_ids:
                if task == "classification":
                    metric_fn = {"accuracy": accuracy_score, "balanced_accuracy": balanced_accuracy_score, "f1_macro": lambda a, b: f1_score(a, b, average="macro", zero_division=0), "precision_macro": lambda a, b: precision_score(a, b, average="macro", zero_division=0), "recall_macro": lambda a, b: recall_score(a, b, average="macro", zero_division=0)}.get(metric)
                    value = _roc_auc_from_scores(truth, response_scores) if metric == "roc_auc" else metric_fn(truth, pred)
                else:
                    value = r2_score(truth, pred) if metric == "r2" else mean_absolute_error(truth, pred)
                values[metric].append(float(value))
        evaluation_runtime = round(time.perf_counter() - evaluation_started, 6)
        model_metrics = {metric: {"mean": float(np.mean(scores)), "std": float(np.std(scores)), "folds": scores} for metric, scores in values.items()}
        y_eval = np.concatenate(y_true_parts)
        pred_eval = np.concatenate(prediction_parts)
        fairness_results = {}
        if config["fairness_metrics"]:
            eval_idx = np.concatenate([test for _train, test in splits])
            sensitive = frame.iloc[eval_idx][sensitive_features].fillna("<missing>")
            calculated, group_count = binary_fairness_metrics(y_eval, pred_eval, config["positive_value"], sensitive)
            fairness_results = {metric: calculated[metric] if group_count >= 2 else None for metric in config["fairness_metrics"]}
        positive = config["positive_value"] if config["positive_value"] is not None else y.drop_duplicates().iloc[-1]
        negative = next(value for value in y.drop_duplicates().tolist() if value != positive) if task == "classification" and y.nunique() == 2 else None
        full_estimator = _fit_candidate(X, y, all_sensitive, model_name, method, scaler, seed, positive)
        if method.startswith("exponentiated_gradient") or method.startswith("threshold_optimizer"):
            full_estimator = FairnessLabelAdapter(full_estimator, negative, positive, method, sensitive_features, seed)
        fitted[(model_name, method)] = full_estimator
        model_label = MODEL_REGISTRY[model_name]["label"]
        results.append({"model": model_name, "label": model_label if method == "none" else f"{model_label} · {FAIRNESS_METHODS[method]}", "model_label": model_label, "fairness_method": method, "fairness_method_label": FAIRNESS_METHODS[method], "parameters": MODEL_FACTORIES[model_name](seed).get_params(deep=False), "metrics": model_metrics, "fairness_metrics": fairness_results, "evaluation_time_seconds": evaluation_runtime})
        if progress_callback:
            progress_callback(int(index * 100 / len(run_specs)))

    objectives = list(metric_ids) + list(config["fairness_metrics"])
    direction = {metric: ("min" if metric in {"mean_absolute_error", "demographic_parity_difference", "equalized_odds_difference"} else "max") for metric in objectives}
    raw_values = []
    for model in results:
        row = {metric: model["metrics"][metric]["mean"] for metric in metric_ids}
        row.update({metric: model["fairness_metrics"].get(metric) for metric in config["fairness_metrics"]})
        raw_values.append(row)
    vectors = []
    for i, row in enumerate(raw_values):
        vector = {}
        for metric in objectives:
            vals = [candidate[metric] for candidate in raw_values if candidate[metric] is not None]
            if row[metric] is None or not vals:
                vector[metric] = 0.0
                continue
            low, high = min(vals), max(vals)
            scaled = 1.0 if high == low else (row[metric] - low) / (high - low)
            vector[metric] = 1.0 - scaled if direction[metric] == "min" else scaled
        vectors.append(vector)
    pareto_indexes = []
    for i, candidate in enumerate(vectors):
        dominated = any(j != i and all(other[m] >= candidate[m] for m in objectives) and any(other[m] > candidate[m] for m in objectives) for j, other in enumerate(vectors))
        results[i]["pareto_optimal"] = not dominated
        if not dominated:
            pareto_indexes.append(i)
    aggregation = config["tradeoff"]["aggregation_function"]
    if aggregation == "min":
        scores = [min(vector.values()) for vector in vectors]
    elif aggregation == "weighted_sum":
        objective_weights = np.asarray([config.get("metric_weights", {}).get(metric, 1.0) for metric in objectives], dtype=float)
        scores = [float(np.dot(list(vector.values()), objective_weights)) for vector in vectors]
    elif aggregation == "harmonic_mean":
        # Normalized utilities are non-negative; a zero on any objective makes
        # the harmonic mean zero, as defined mathematically.
        scores = [float(len(vector) / sum(1.0 / value for value in vector.values())) if vector and all(value > 0 for value in vector.values()) else 0.0 for vector in vectors]
    else:
        scores = [float(np.mean(list(vector.values()))) for vector in vectors]
    tradeoff_strategy = config["tradeoff"]["strategy"]
    primary_metric = config["tradeoff"].get("primary_metric")
    if tradeoff_strategy == "primary_metric":
        scores = [vector[primary_metric] for vector in vectors]
    for row, score in zip(results, scores):
        row["tradeoff_score"] = float(score)
    best_index = max(pareto_indexes if tradeoff_strategy == "pareto" else range(len(results)), key=lambda i: scores[i])
    best = results[best_index]
    joblib.dump(fitted[(best["model"], best["fairness_method"])], os.path.join(output_dir, "best_model.joblib"))
    metric_rows = []
    for row in results:
        record = {"model": row["model"]}
        for metric, stat in row["metrics"].items():
            record[f"{metric}_mean"], record[f"{metric}_std"] = stat["mean"], stat["std"]
        record.update(row["fairness_metrics"])
        record.update({"fairness_method": row["fairness_method"], "evaluation_time_seconds": row["evaluation_time_seconds"], "tradeoff_score": row["tradeoff_score"], "pareto_optimal": row["pareto_optimal"]})
        metric_rows.append(record)
    pd.DataFrame(metric_rows).to_csv(os.path.join(output_dir, "metrics.csv"), index=False)
    warnings = []
    dropped = rows_before - len(frame)
    if dropped:
        warnings.append(f"Dropped {dropped} rows with missing or invalid target values.")
    if any(value is None for model in results for value in model["fairness_metrics"].values()):
        warnings.append("A fairness metric could not be calculated because fewer than two sensitive groups remained in evaluated rows.")
    reported_primary_metric = primary_metric if tradeoff_strategy == "primary_metric" else metric_ids[0]
    reported_primary_value = best["metrics"].get(reported_primary_metric, {}).get("mean")
    if reported_primary_value is None:
        reported_primary_value = best["fairness_metrics"].get(reported_primary_metric)
    summary = {
        "best_config": {"model": best["model"], "fairness_method": best["fairness_method"]},
        "primary_metric": reported_primary_metric, "best_metric_value": reported_primary_value,
        "num_combinations_evaluated": len(results), "tradeoff_strategy": tradeoff_strategy,
        "aggregation_function": aggregation,
        "pareto_front": [f"{results[i]['model']}|{results[i]['fairness_method']}" for i in pareto_indexes],
        "objectives": objectives,
    }
    package_versions = {}
    for package in ("scikit-learn", "pandas", "numpy", "fairlearn"):
        try:
            package_versions[package] = version(package)
        except PackageNotFoundError:
            package_versions[package] = "unknown"
    return {
        "experiment_id": config.get("experiment_id"), "status": "SUCCESS", "task_type": task,
        "created_at": config.get("created_at"), "started_at": started_at,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "execution_time_seconds": round(time.perf_counter() - started_clock, 3),
        "results": results, "summary": summary,
        "training_metadata": {"validation_strategy": strategy, "folds": folds if strategy != "train_test_split" else 1, "test_size": test_size if strategy == "train_test_split" else None, "random_seed": seed, "rows_evaluated": len(frame) if strategy != "train_test_split" else len(splits[0][1]), "feature_columns": features, "dataset_sha256": config.get("dataset_sha256"), "package_versions": package_versions, "graph_options": config.get("graph_options", ["tradeoff_score", "metric_scatter"]), "graph_axes": config.get("graph_axes", {}), "metric_weights": config.get("metric_weights", {})},
        "artifacts": {"metrics_csv": "metrics.csv", "best_model": "best_model.joblib"},
        "warnings": warnings, "errors": [],
    }
