from model_registry import MODEL_REGISTRY

FAIRNESS_METHODS = {
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

MODEL_RECOMMENDATIONS = {
    "logistic_regression": (
        "Recommended baseline",
        "A linear classification baseline with score outputs and sample-weight support, "
        "so it can be compared with the available binary fairness methods.",
    ),
    "random_forest_classifier": (
        "Recommended comparison",
        "A tree ensemble can capture nonlinear patterns and does not depend on feature scaling. "
        "Compare it with a linear baseline using held-out results.",
    ),
    "ridge_regression": (
        "Recommended baseline",
        "A regularized linear regression baseline; regularization can reduce coefficient variance "
        "when predictors are correlated.",
    ),
    "random_forest_regressor": (
        "Recommended comparison",
        "A tree ensemble can capture nonlinear patterns and does not depend on feature scaling. "
        "Compare it with a linear baseline using held-out results.",
    ),
}


def fairness_method_compatibility(profile: dict, model_name: str) -> dict[str, dict]:
    model = MODEL_REGISTRY[model_name]
    binary = profile.get("task_type") == "classification" and profile.get("n_classes") == 2
    method_supports = {}
    for method, label in FAIRNESS_METHODS.items():
        score_based = method.startswith("threshold_optimizer")
        model_capable = model.get("supports_score", False) if score_based else model.get("supports_sample_weight", False)
        compatible = binary and model_capable
        if profile.get("task_type") == "regression":
            reason = "This mitigation is defined here for binary classification; the selected target is a regression target."
        elif profile.get("task_type") != "classification":
            reason = "This mitigation needs a valid binary classification target; the selected target type could not be inferred."
        elif profile.get("n_classes") != 2:
            reason = (
                f"This mitigation currently requires exactly two target classes; "
                f"the selected target has {profile.get('n_classes')} classes."
            )
        elif not model_capable and score_based:
            reason = "Threshold optimization needs probability or decision scores from the estimator; this model does not expose them."
        elif not model_capable:
            reason = "This mitigation fits using sample weights; this model does not accept sample weights."
        else:
            reason = ""
        method_supports[method] = {"label": label, "compatible": compatible, "reason": reason}
    return method_supports


def check_model(profile: dict, model_name: str) -> dict:
    """
    Check whether one model is compatible with a dataset profile.
    """
    if model_name not in MODEL_REGISTRY:
        raise ValueError(
            f"Unknown model: {model_name}"
        )

    config = MODEL_REGISTRY[model_name]

    reasons = []
    warnings = []

    task_type = profile.get("task_type", "unknown")
    n_rows = profile.get("n_rows", 0)
    n_categorical_features = profile.get(
        "n_categorical_features",
        0,
    )
    missing_value_ratio = profile.get(
        "missing_value_ratio",
        0,
    )

    if task_type not in config["tasks"]:
        reasons.append(
            f"This model supports "
            f"{', '.join(config['tasks'])} tasks, "
            f"but the dataset task is {task_type}."
        )

    if n_rows < config["minimum_rows"]:
        reasons.append(
            f"The dataset has too few rows. "
            f"At least {config['minimum_rows']} rows are required."
        )
    if n_rows < 20 and n_rows >= config["minimum_rows"]:
        warnings.append("Very small sample: use this dataset to test the pipeline only; model scores are not reliable for conclusions.")

    if n_categorical_features > 0 and config.get("supports_categorical_features"):
        warnings.append("Categorical features will be one-hot encoded inside each validation fold.")

    if missing_value_ratio > 0 and config.get("supports_missing_values"):
        warnings.append("Missing values will be imputed inside each validation fold.")

    recommendation = MODEL_RECOMMENDATIONS.get(model_name)
    if n_rows < 100:
        if recommendation:
            recommendation = (
                "Exploratory baseline",
                f"{recommendation[1]} This sample is small, so use it to check the workflow rather than rank model quality.",
            )
    if recommendation and task_type == "classification" and profile.get("n_classes") != 2:
        recommendation = (recommendation[0], f"{recommendation[1]} The current fairness methods are unavailable because this target is not binary.")

    return {
        "model": model_name,
        "label": config["label"],
        "compatible": len(reasons) == 0,
        "reasons": reasons,
        "warnings": warnings,
        "recommendation": recommendation[0] if recommendation else None,
        "recommendation_reason": recommendation[1] if recommendation else None,
        "fairness_methods": fairness_method_compatibility(profile, model_name),
    }


def check_all_models(profile: dict) -> list[dict]:
    """
    Check every registered model against a dataset profile.
    """
    return [
        check_model(profile, model_name)
        for model_name in MODEL_REGISTRY
    ]
