"""Validation and normalization for the public experiment request contract."""

from pathlib import Path
import hashlib

import numpy as np
import pandas as pd

from dataset_profiler import profile_dataset
from model_registry import MODEL_REGISTRY


CLASSIFICATION_METRICS = {"accuracy", "balanced_accuracy", "f1_macro", "precision_macro", "recall_macro", "roc_auc"}
REGRESSION_METRICS = {"r2", "mean_absolute_error"}
FAIRNESS_METRICS = {"demographic_parity_difference", "equalized_odds_difference"}
FAIRNESS_METHODS = {"reweighing", "exponentiated_gradient_dp", "exponentiated_gradient_eo", "exponentiated_gradient_tpr", "threshold_optimizer_eo", "threshold_optimizer_dp", "threshold_optimizer_tpr", "threshold_optimizer_fpr", "threshold_optimizer_fnr"}
GRAPH_OPTIONS = {"tradeoff_score", "metric_scatter", "fairness_gaps", "runtime", "metric_comparison", "metric_stability", "pareto_plot"}


def normalize_experiment_config(payload: object, data_dir: str) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("The experiment request must be a JSON object.")

    raw_path = payload.get("dataset_path")
    if not isinstance(raw_path, str) or not raw_path.strip():
        raise ValueError("Choose a dataset before creating the experiment.")
    root = Path(data_dir).resolve()
    dataset_path = Path(raw_path).resolve()
    if not dataset_path.is_relative_to(root) or not dataset_path.is_file():
        raise ValueError("Dataset path is invalid or unavailable. Upload the CSV again.")
    if dataset_path.suffix.lower() != ".csv":
        raise ValueError("Only CSV datasets are supported.")

    try:
        frame = pd.read_csv(dataset_path)
    except Exception as error:
        raise ValueError(f"Could not read the uploaded CSV: {error}") from error
    if frame.empty:
        raise ValueError("The selected dataset has no rows.")
    if len(frame.columns) < 2:
        raise ValueError("The dataset must contain a target column and at least one feature.")
    if not frame.columns.is_unique:
        raise ValueError("The dataset contains duplicate column names. Rename them and upload again.")

    target = payload.get("target_column")
    if not isinstance(target, str) or not target.strip():
        raise ValueError("Choose a target column.")
    if target not in frame.columns:
        raise ValueError(f"Target column '{target}' was not found in the selected dataset.")
    if frame[target].dropna().nunique() < 2:
        raise ValueError(f"Target column '{target}' must contain at least two distinct non-empty values.")
    usable_frame = frame.dropna(subset=[target])

    profile = profile_dataset(frame, target)
    task_type = profile["task_type"]
    if task_type not in ("classification", "regression"):
        raise ValueError(f"Could not infer a supported task type from target column '{target}'.")
    requested_task = payload.get("task_type", task_type)
    if requested_task != task_type:
        raise ValueError(f"Task type mismatch: target column '{target}' is inferred as {task_type}.")

    features = payload.get("feature_columns", [column for column in frame.columns if column != target])
    if not isinstance(features, list) or not features or any(not isinstance(column, str) for column in features):
        raise ValueError("Select at least one feature column.")
    if target in features or len(set(features)) != len(features):
        raise ValueError("Feature columns must be unique and must not include the target column.")
    unknown_features = [column for column in features if column not in frame.columns]
    if unknown_features:
        raise ValueError(f"Unknown feature column(s): {', '.join(unknown_features)}.")

    sensitive = payload.get("sensitive_features", [])
    if not isinstance(sensitive, list) or any(column not in features for column in sensitive):
        raise ValueError("Sensitive features must be selected from the feature columns.")
    if len(set(sensitive)) != len(sensitive):
        raise ValueError("Sensitive feature names must be unique.")

    models = payload.get("models")
    if not isinstance(models, list) or not models:
        raise ValueError("Select at least one model.")
    if any(not isinstance(name, str) or name not in MODEL_REGISTRY for name in models):
        raise ValueError("One or more selected models are not supported.")
    if len(set(models)) != len(models):
        raise ValueError("Selected model names must be unique.")
    for name in models:
        if task_type not in MODEL_REGISTRY[name]["tasks"]:
            raise ValueError(f"{MODEL_REGISTRY[name]['label']} does not support {task_type} tasks.")
        if len(usable_frame) < MODEL_REGISTRY[name]["minimum_rows"]:
            minimum = MODEL_REGISTRY[name]["minimum_rows"]
            raise ValueError(f"{MODEL_REGISTRY[name]['label']} requires at least {minimum} dataset rows.")

    fairness_methods = payload.get("fairness_methods", [])
    if not isinstance(fairness_methods, list) or any(not isinstance(method, str) or method not in FAIRNESS_METHODS for method in fairness_methods):
        raise ValueError(f"Choose supported bias mitigation methods: {', '.join(sorted(FAIRNESS_METHODS))}.")
    if len(set(fairness_methods)) != len(fairness_methods):
        raise ValueError("Bias mitigation method names must be unique.")

    validation_strategy = payload.get("validation_strategy", "stratified_kfold" if task_type == "classification" else "kfold")
    supported_validation = {"train_test_split", "kfold", "stratified_kfold"} if task_type == "classification" else {"train_test_split", "kfold"}
    if not isinstance(validation_strategy, str) or validation_strategy not in supported_validation:
        raise ValueError(f"Choose a supported validation strategy: {', '.join(sorted(supported_validation))}.")
    test_size = payload.get("test_size", 0.2)
    if isinstance(test_size, bool) or not isinstance(test_size, (int, float)) or not 0.1 <= test_size <= 0.5:
        raise ValueError("Train/test split size must be between 10% and 50%.")

    folds = payload.get("cv_folds", 5)
    if isinstance(folds, bool) or not isinstance(folds, int) or not 2 <= folds <= 20:
        raise ValueError("Cross-validation folds must be an integer between 2 and 20.")
    if task_type == "classification":
        class_counts = usable_frame[target].value_counts()
        if validation_strategy != "train_test_split" and class_counts.min() < folds:
            raise ValueError(f"Each target class needs at least {folds} rows for {folds}-fold cross-validation.")
        if validation_strategy == "train_test_split":
            test_rows = int(np.ceil(len(usable_frame) * float(test_size)))
            train_rows = len(usable_frame) - test_rows
            if class_counts.min() < 2 or min(test_rows, train_rows) < len(class_counts):
                raise ValueError("The dataset is too small to stratify the requested train/test split.")
    else:
        regression_values = pd.to_numeric(frame[target], errors="coerce").to_numpy(dtype=float, na_value=np.nan)
        finite_rows = int(np.isfinite(regression_values).sum())
        if validation_strategy != "train_test_split" and finite_rows < folds:
            raise ValueError(f"At least {folds} rows with finite target values are required.")
        if validation_strategy == "train_test_split" and finite_rows < 2:
            raise ValueError("At least two rows with finite target values are required for a train/test split.")

    metrics = payload.get("metrics", ["accuracy", "balanced_accuracy"] if task_type == "classification" else ["r2", "mean_absolute_error"])
    supported_metrics = CLASSIFICATION_METRICS if task_type == "classification" else REGRESSION_METRICS
    if not isinstance(metrics, list) or not metrics or any(not isinstance(metric, str) or metric not in supported_metrics for metric in metrics):
        raise ValueError(f"Choose one or more supported {task_type} metrics: {', '.join(sorted(supported_metrics))}.")
    if len(set(metrics)) != len(metrics):
        raise ValueError("Evaluation metric names must be unique.")

    graph_options = payload.get("graph_options", ["tradeoff_score", "metric_scatter"])
    if not isinstance(graph_options, list) or not graph_options or any(not isinstance(option, str) or option not in GRAPH_OPTIONS for option in graph_options):
        raise ValueError(f"Choose one or more supported graph types: {', '.join(sorted(GRAPH_OPTIONS))}.")
    if len(set(graph_options)) != len(graph_options):
        raise ValueError("Graph type selections must be unique.")
    graph_axes_payload = payload.get("graph_axes", {})
    if not isinstance(graph_axes_payload, dict):
        raise ValueError("Graph axes must be supplied as an object.")

    tradeoff_strategy = payload.get("tradeoff_strategy", "aggregation")
    if tradeoff_strategy not in ("aggregation", "primary_metric", "pareto"):
        raise ValueError("Trade-off strategy must be aggregation, primary metric, or pareto.")
    aggregation_function = payload.get("aggregation_function", "mean")
    aggregation_function = {"mean_normalized": "mean", "weighted_mean": "weighted_sum"}.get(aggregation_function, aggregation_function)
    if aggregation_function not in ("mean", "weighted_sum", "harmonic_mean", "min"):
        raise ValueError("Aggregation function must be normalized mean, weighted sum, or harmonic mean.")
    primary_metric = payload.get("primary_metric")
    if tradeoff_strategy == "primary_metric" and primary_metric not in [*metrics, *payload.get("fairness_metrics", [])]:
        raise ValueError("Choose a primary metric from the selected effectiveness or fairness metrics.")

    preprocessing = payload.get("preprocessing", {})
    if not isinstance(preprocessing, dict):
        raise ValueError("Preprocessing configuration must be an object.")
    scaler = preprocessing.get("scaler", "standard")
    if scaler not in ("standard", "minmax", "robust", "maxabs", "normalize", "none"):
        raise ValueError("Scaler must be standard, minmax, or none.")

    seed = payload.get("random_seed", 42)
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed <= 2**32 - 1:
        raise ValueError("Random seed must be an integer between 0 and 4294967295.")

    positive_value = payload.get("positive_value")
    if positive_value is not None and task_type == "classification":
        values = frame[target].dropna().unique().tolist()
        match = next((value for value in values if str(value) == str(positive_value)), None)
        if match is None:
            raise ValueError(f"Positive label value '{positive_value}' is not present in target column '{target}'.")
        positive_value = match.item() if hasattr(match, "item") else match

    fairness_metrics = payload.get("fairness_metrics", [])
    if not isinstance(fairness_metrics, list) or any(not isinstance(metric, str) or metric not in FAIRNESS_METRICS for metric in fairness_metrics):
        raise ValueError(f"Choose supported fairness metrics: {', '.join(sorted(FAIRNESS_METRICS))}.")
    if len(set(fairness_metrics)) != len(fairness_metrics):
        raise ValueError("Fairness metric names must be unique.")
    if fairness_methods and not fairness_metrics:
        fairness_metrics = sorted(FAIRNESS_METRICS)
    if "fairness_gaps" in graph_options and not fairness_metrics:
        raise ValueError("Fairness gap graphs require at least one selected fairness metric.")
    if fairness_metrics:
        if task_type != "classification" or frame[target].nunique(dropna=True) != 2:
            raise ValueError("Fairness metrics currently require a binary classification target.")
        if not sensitive:
            raise ValueError("Choose at least one sensitive feature to calculate fairness metrics.")
        if positive_value is None:
            positive_value = frame[target].dropna().unique().tolist()[-1]
            positive_value = positive_value.item() if hasattr(positive_value, "item") else positive_value
    metric_weights = payload.get("metric_weights", {})
    objective_metrics = [*metrics, *fairness_metrics]
    if any(graph in graph_options for graph in ("metric_scatter", "pareto_plot")) and len(objective_metrics) < 2:
        raise ValueError("Metric scatter and Pareto plots need at least two selected effectiveness or fairness metrics.")
    normalized_graph_axes = {}
    for graph in ("metric_scatter", "pareto_plot"):
        if graph not in graph_options:
            continue
        axes = graph_axes_payload.get(graph, {})
        if not isinstance(axes, dict):
            raise ValueError(f"The {graph} axes must be an object with x and y metrics.")
        x_metric = axes.get("x")
        y_metric = axes.get("y")
        if x_metric is None:
            x_metric = objective_metrics[0]
        if y_metric is None:
            y_metric = next(metric for metric in objective_metrics if metric != x_metric)
        if x_metric not in objective_metrics or y_metric not in objective_metrics:
            raise ValueError(f"The {graph} axes must use metrics selected for this experiment.")
        if x_metric == y_metric:
            raise ValueError(f"The {graph} x and y axes must use different metrics.")
        normalized_graph_axes[graph] = {"x": x_metric, "y": y_metric}
    if not isinstance(metric_weights, dict) or any(not isinstance(name, str) or name not in objective_metrics for name in metric_weights):
        raise ValueError("Metric weights must be supplied only for selected effectiveness or fairness metrics.")
    normalized_weights = {}
    for metric in objective_metrics:
        weight = metric_weights.get(metric, 1)
        if isinstance(weight, bool) or not isinstance(weight, (int, float)) or not np.isfinite(weight) or not 0 <= weight <= 1:
            raise ValueError(f"The weight for {metric} must be a number between 0 and 1.")
        normalized_weights[metric] = float(weight)
    if tradeoff_strategy == "aggregation" and aggregation_function == "weighted_sum" and not any(weight > 0 for weight in normalized_weights.values()):
        raise ValueError("At least one selected metric must have a positive weight for weighted sum aggregation.")
    if fairness_methods:
        if task_type != "classification" or frame[target].nunique(dropna=True) != 2:
            raise ValueError("Bias mitigation methods require a binary classification target.")
        if not sensitive:
            raise ValueError("Choose at least one sensitive feature before applying bias mitigation.")
        for method in fairness_methods:
            if method in {"reweighing", "exponentiated_gradient_dp", "exponentiated_gradient_eo", "exponentiated_gradient_tpr"}:
                unsupported = [name for name in models if not MODEL_REGISTRY[name].get("supports_sample_weight")]
                if unsupported:
                    labels = ", ".join(MODEL_REGISTRY[name]["label"] for name in unsupported)
                    raise ValueError(f"{method.replace('_', ' ').title()} requires sample-weight-compatible models; remove: {labels}.")
            if method.startswith("threshold_optimizer"):
                unsupported = [name for name in models if not MODEL_REGISTRY[name].get("supports_score")]
                if unsupported:
                    labels = ", ".join(MODEL_REGISTRY[name]["label"] for name in unsupported)
                    raise ValueError(f"Threshold optimization requires models with probability or decision scores; remove: {labels}.")

    metadata = payload.get("metadata", {})
    if not isinstance(metadata, dict):
        raise ValueError("Experiment metadata must be an object.")
    experiment_name = payload.get("experiment_name", "")
    if not isinstance(experiment_name, str) or len(experiment_name) > 100:
        raise ValueError("Experiment name must be text with at most 100 characters.")
    experiment_name = experiment_name.strip()

    validation = {"strategy": validation_strategy, "folds": folds}
    if validation_strategy == "train_test_split":
        validation["test_size"] = float(test_size)

    return {
        "experiment_name": experiment_name,
        "dataset_path": str(dataset_path),
        "dataset_sha256": hashlib.sha256(dataset_path.read_bytes()).hexdigest(),
        "target_column": target,
        "feature_columns": features,
        "task_type": task_type,
        "preprocessing": {"scaler": scaler},
        "validation": validation,
        "random_seed": seed,
        "models": models,
        "metrics": metrics,
        "metric_weights": normalized_weights,
        "graph_options": graph_options,
        "graph_axes": normalized_graph_axes,
        "tradeoff": {"strategy": tradeoff_strategy, "aggregation_function": aggregation_function, "primary_metric": primary_metric},
        "fairness_metrics": fairness_metrics,
        "fairness_methods": fairness_methods,
        "sensitive_features": sensitive,
        "positive_value": positive_value,
        "metadata": metadata,
    }
