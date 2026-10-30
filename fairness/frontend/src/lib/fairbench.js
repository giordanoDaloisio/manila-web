// Static domain data for FairBench wizard: datasets, models, methods, metrics.

export const BUILTIN_DATASETS = [
  { id: "adult_small", name: "Adult Income", description: "Small Adult-style income dataset with age, sex, race, and an income label.", recommendation: "Recommended for first use", recommendation_reason: "A binary income target and sex/race group fields make this a straightforward dataset for exploring the fairness workflow. This is a small demo sample, so treat results as exploratory.", rows: 200, columns: ["age", "sex", "race", "income"], label_column: "income", positive_label: "1", sensitive_attrs_suggested: ["sex", "race"], preview: [{ age: 62, sex: 0, race: 0, income: 0 }] },
  { id: "compas_recidivism", name: "COMPAS Recidivism", description: "Synthetic COMPAS-style recidivism example with age, race, sex, charge degree, and prior counts.", recommendation: "Criminal justice example", recommendation_reason: "This generated dataset supports a recidivism classification walkthrough. It is not the original COMPAS dataset and should not be used to draw conclusions about people or criminal justice systems.", rows: 1500, columns: ["age", "sex", "race", "priors_count", "c_charge_degree", "two_year_recid"], label_column: "two_year_recid", positive_label: "1", sensitive_attrs_suggested: ["race", "sex"], preview: [{ age: 33, sex: "Male", race: "African-American", priors_count: 7, c_charge_degree: "F", two_year_recid: 1 }] },
  { id: "german_credit", name: "German Credit", description: "Synthetic German Credit-style credit-risk example with credit history, duration, amount, sex, age, and foreign-worker status.", recommendation: "Credit risk example", recommendation_reason: "This generated dataset supports a credit-risk classification walkthrough. It is not the original German Credit dataset and should not be used for lending decisions or real-world conclusions.", rows: 1200, columns: ["duration", "credit_history", "amount", "sex", "age", "foreign_worker", "class"], label_column: "class", positive_label: "good", sensitive_attrs_suggested: ["sex", "foreign_worker"], preview: [{ duration: 18, credit_history: "existing", amount: 3400, sex: "male", age: 42, foreign_worker: "yes", class: "good" }] },
];

export const SCALERS = [
  { id: "None", name: "None", description: "Use raw feature values with no scaling." },
  { id: "StandardScaler", name: "StandardScaler", description: "Zero mean, unit variance." },
  { id: "MinMaxScaler", name: "MinMaxScaler", description: "Scale each feature to [0, 1]." },
  { id: "RobustScaler", name: "RobustScaler", description: "Use median and IQR." },
  { id: "MaxAbsScaler", name: "MaxAbsScaler", description: "Scale by maximum absolute value." },
  { id: "Normalizer", name: "Normalizer", description: "Scale each sample to unit norm." },
];

export const CLASSIFICATION_MODELS = ["Logistic Regression", "Random Forest Classifier", "Extra Trees Classifier", "Linear SVC", "Support Vector Classifier", "Gradient Descent Classifier", "Gradient Boosting Classifier", "MLP Classifier", "Decision Tree Classifier", "K-Nearest Neighbors Classifier", "Gaussian Naive Bayes", "AdaBoost Classifier"];
export const REGRESSION_MODELS = ["Random Forest Regressor", "Linear Regression", "Ridge Regression", "Gradient Boosting Regressor", "Extra Trees Regressor"];

export const FAIRNESS_METHOD_GROUPS = [
  { group: "Pre-processing", methods: [{ id: "Reweighing", sourceId: "reweighing", name: "Reweighing", info: "Adjust sample weights to account for group imbalance." }] },
  { group: "In-processing", methods: [
    { id: "Exponentiated Gradient · Demographic Parity", sourceId: "exponentiated_gradient_dp", name: "Exponentiated Gradient · Demographic Parity", info: "Constrain demographic parity during model fitting." },
    { id: "Exponentiated Gradient · Equalized Odds", sourceId: "exponentiated_gradient_eo", name: "Exponentiated Gradient · Equalized Odds", info: "Constrain equalized odds during model fitting." },
    { id: "Exponentiated Gradient · Equal Opportunity", sourceId: "exponentiated_gradient_tpr", name: "Exponentiated Gradient · Equal Opportunity", info: "Constrain equal opportunity during model fitting." },
  ] },
  { group: "Post-processing", methods: [
    { id: "Threshold Optimizer · Equalized Odds", sourceId: "threshold_optimizer_eo", name: "Threshold Optimizer · Equalized Odds", info: "Optimize prediction thresholds to reduce equalized odds gaps." },
    { id: "Threshold Optimizer · Demographic Parity", sourceId: "threshold_optimizer_dp", name: "Threshold Optimizer · Demographic Parity", info: "Optimize prediction thresholds for demographic parity." },
    { id: "Threshold Optimizer · Equal Opportunity", sourceId: "threshold_optimizer_tpr", name: "Threshold Optimizer · Equal Opportunity", info: "Optimize prediction thresholds for equal opportunity." },
    { id: "Threshold Optimizer · False Positive Rate Parity", sourceId: "threshold_optimizer_fpr", name: "Threshold Optimizer · False Positive Rate Parity", info: "Optimize thresholds for false positive rate parity." },
    { id: "Threshold Optimizer · False Negative Rate Parity", sourceId: "threshold_optimizer_fnr", name: "Threshold Optimizer · False Negative Rate Parity", info: "Optimize thresholds for false negative rate parity." },
  ] },
];
export const ALL_FAIRNESS_METHODS = FAIRNESS_METHOD_GROUPS.flatMap((group) => group.methods.map((method) => method.id));
export const CLASSIFICATION_EFFECTIVENESS = ["accuracy", "balanced_accuracy", "f1_macro", "precision_macro", "recall_macro", "roc_auc"];
export const REGRESSION_EFFECTIVENESS = ["r2", "mean_absolute_error"];
export const METRIC_LABELS = {
  accuracy: "Accuracy", balanced_accuracy: "Balanced accuracy", f1_macro: "F1 (macro)",
  precision_macro: "Precision (macro)", recall_macro: "Recall (macro)", roc_auc: "ROC-AUC",
  r2: "R²", mean_absolute_error: "Mean absolute error",
  demographic_parity_difference: "Demographic parity difference",
  equalized_odds_difference: "Equalized odds difference",
};
export const FAIRNESS_METRICS_BY_ANSWER = {
  individual: [{ id: "demographic_parity_difference", info: "Difference in positive prediction rates across groups (0 is fair)." }, { id: "equalized_odds_difference", info: "Largest true or false positive rate gap across groups (0 is fair)." }],
  equally: [{ id: "demographic_parity_difference", info: "Difference in positive prediction rates across groups (0 is fair)." }, { id: "equalized_odds_difference", info: "Largest true or false positive rate gap across groups (0 is fair)." }],
  proportionally: [{ id: "demographic_parity_difference", info: "Difference in positive prediction rates across groups (0 is fair)." }, { id: "equalized_odds_difference", info: "Largest true or false positive rate gap across groups (0 is fair)." }],
  other: [{ id: "demographic_parity_difference", info: "Difference in positive prediction rates across groups (0 is fair)." }, { id: "equalized_odds_difference", info: "Largest true or false positive rate gap across groups (0 is fair)." }],
};

export function generateScript(config) {
  const modelIds = {
    "Logistic Regression": "logistic_regression", "Random Forest Classifier": "random_forest_classifier",
    "Extra Trees Classifier": "extra_trees_classifier", "Linear SVC": "linear_svc",
    "Support Vector Classifier": "support_vector_classifier", "Gradient Descent Classifier": "sgd_classifier",
    "Gradient Boosting Classifier": "gradient_boosting_classifier", "MLP Classifier": "mlp_classifier",
    "Decision Tree Classifier": "decision_tree_classifier", "K-Nearest Neighbors Classifier": "knn_classifier",
    "Gaussian Naive Bayes": "gaussian_nb", "AdaBoost Classifier": "adaboost_classifier",
    "Random Forest Regressor": "random_forest_regressor", "Linear Regression": "linear_regression",
    "Ridge Regression": "ridge_regression", "Gradient Boosting Regressor": "gradient_boosting_regressor",
    "Extra Trees Regressor": "extra_trees_regressor",
  };
  const methodIds = {
    "Reweighing": "reweighing", "Exponentiated Gradient · Demographic Parity": "exponentiated_gradient_dp",
    "Exponentiated Gradient · Equalized Odds": "exponentiated_gradient_eo",
    "Exponentiated Gradient · Equal Opportunity": "exponentiated_gradient_tpr",
    "Threshold Optimizer · Equalized Odds": "threshold_optimizer_eo",
    "Threshold Optimizer · Demographic Parity": "threshold_optimizer_dp",
    "Threshold Optimizer · Equal Opportunity": "threshold_optimizer_tpr",
    "Threshold Optimizer · False Positive Rate Parity": "threshold_optimizer_fpr",
    "Threshold Optimizer · False Negative Rate Parity": "threshold_optimizer_fnr",
  };
  const scalerIds = { None: "none", StandardScaler: "standard", MinMaxScaler: "minmax", RobustScaler: "robust", MaxAbsScaler: "maxabs", Normalizer: "normalize" };
  const metricWeights = Object.fromEntries([...(config.effectiveness_metrics || []), ...(config.fairness_metrics || [])].map((item) => [item.name, item.weight]));
  const selectedMetrics = (config.effectiveness_metrics || []).map((item) => item.name);
  const selectedFairnessMetrics = config.fairness_enabled ? (config.fairness_metrics || []).map((item) => item.name) : [];
  const request = {
    experiment_name: config.name || "FairBench experiment",
    target_column: config.dataset.label_column,
    feature_columns: (config.dataset.columns || []).filter((column) => column !== config.dataset.label_column),
    task_type: config.task_type,
    preprocessing: { scaler: scalerIds[config.scaler] || "standard" },
    validation_strategy: config.validation.method === "train_test" ? "train_test_split" : config.validation.method,
    cv_folds: config.validation.k || 5,
    test_size: (100 - (config.validation.split || 80)) / 100,
    random_seed: config.validation.random_seed ?? 42,
    models: (config.models || []).map((model) => modelIds[model]).filter(Boolean),
    metrics: selectedMetrics,
    fairness_metrics: selectedFairnessMetrics,
    metric_weights: metricWeights,
    fairness_methods: config.fairness_enabled ? (config.fairness_methods || []).filter((method) => method !== "No Method").map((method) => methodIds[method]).filter(Boolean) : [],
    sensitive_features: config.dataset.sensitive_attrs || [],
    positive_value: config.dataset.positive_label || null,
    tradeoff_strategy: config.tradeoff.strategy,
    aggregation_function: config.tradeoff.aggregation || "mean",
    primary_metric: config.tradeoff.primary_metric || null,
    graph_options: config.graph_options || ["tradeoff_score", "metric_scatter"],
    graph_axes: config.graph_axes || {},
  };
  const requestJson = JSON.stringify(request, null, 2);
  return `#!/usr/bin/env python3
"""Reproduce a FairBench experiment with the integrated MANILA training engine.

Run from the Fairness/backend directory after installing requirements.txt:
    python reproduce_experiment.py /path/to/dataset.csv
"""
import argparse
import json
import sys
from pathlib import Path

CONFIG = json.loads(${JSON.stringify(requestJson)})
backend_root = Path(__file__).resolve().parent
if not (backend_root / "app" / "experiment_engine.py").is_file():
    backend_root = Path.cwd()
if not (backend_root / "app" / "experiment_engine.py").is_file():
    raise SystemExit("Run this script from the Fairness/backend directory.")
sys.path.insert(0, str(backend_root))
from app.experiment_engine import run_experiment
from app.validator import normalize_experiment_config

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", help="CSV dataset selected in the FairBench wizard")
    parser.add_argument("--output", default="fairbench-results", help="Directory for metrics and the fitted model")
    args = parser.parse_args()
    dataset = Path(args.dataset).expanduser().resolve()
    if not dataset.is_file():
        parser.error(f"Dataset file does not exist: {dataset}")
    payload = {**CONFIG, "dataset_path": str(dataset)}
    normalized = normalize_experiment_config(payload, str(dataset.parent))
    output = Path(args.output).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    result = run_experiment(normalized, str(output))
    print("Experiment:", CONFIG["experiment_name"])
    print("Best model:", result["summary"]["best_config"]["model"])
    print("Results written to:", output)

if __name__ == "__main__":
    main()
`;
}
