from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import io
import json
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

import pandas as pd
from dataset_profiler import profile_dataset, profile_sensitive_groups
from model_compatibility import check_all_models
from app.validator import normalize_experiment_config


ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
RESULTS_DIR = ROOT_DIR / "results"
DATA_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="FairBench API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- In-memory storage (replaces MongoDB for this prototype) ----------
# NOTE: This data resets whenever the server process restarts (e.g. on redeploy
# or if the host spins the instance down). That's fine for a demo/prototype.
UPLOADED_DATASETS: Dict[str, Dict[str, Any]] = {}
EXPERIMENTS: Dict[str, Dict[str, Any]] = {}
for saved_dataset in UPLOAD_DIR.glob("*.dataset.json"):
    try:
        metadata = json.loads(saved_dataset.read_text())
        metadata["path"] = str((UPLOAD_DIR / metadata["filename"]).resolve())
        UPLOADED_DATASETS[metadata["id"]] = metadata
    except (OSError, ValueError, KeyError):
        logger.warning("Skipping invalid saved dataset metadata %s", saved_dataset)
for saved_result in RESULTS_DIR.glob("*/fairbench_experiment.json"):
    try:
        restored = json.loads(saved_result.read_text())
        EXPERIMENTS[restored["id"]] = restored
    except (OSError, ValueError, KeyError):
        logger.warning("Skipping invalid saved experiment %s", saved_result)

BUILTIN_DATASETS = {
    "adult_small": {"name": "Adult Income", "description": "Small Adult-style income dataset with age, sex, race, and an income label.", "target": "income", "path": "adult_small.csv", "sensitive": ["sex", "race"]},
    "compas_recidivism": {"name": "COMPAS Recidivism", "description": "Synthetic COMPAS-style recidivism example. Not the original COMPAS dataset.", "target": "two_year_recid", "path": "compas_recidivism.csv", "sensitive": ["race", "sex"]},
    "german_credit": {"name": "German Credit", "description": "Synthetic German Credit-style credit-risk example. Not the original German Credit dataset.", "target": "class", "path": "german_credit.csv", "sensitive": ["sex", "foreign_worker"]},
}

MODEL_IDS = {
    "Logistic Regression": "logistic_regression", "Support Vector Classifier": "support_vector_classifier",
    "Gradient Descent Classifier": "sgd_classifier", "Gradient Boosting Classifier": "gradient_boosting_classifier",
    "MLP Classifier": "mlp_classifier", "Decision Tree Classifier": "decision_tree_classifier",
    "Random Forest Classifier": "random_forest_classifier", "Extra Trees Classifier": "extra_trees_classifier",
    "Linear SVC": "linear_svc", "K-Nearest Neighbors Classifier": "knn_classifier",
    "Gaussian Naive Bayes": "gaussian_nb", "AdaBoost Classifier": "adaboost_classifier", "Linear Regression": "linear_regression",
    "Gradient Boosting Regressor": "gradient_boosting_regressor", "Random Forest Regressor": "random_forest_regressor",
    "Ridge Regression": "ridge_regression", "Extra Trees Regressor": "extra_trees_regressor",
}
METHOD_IDS = {
    "Reweighing": "reweighing", "Exponentiated Gradient · Demographic Parity": "exponentiated_gradient_dp",
    "Exponentiated Gradient · Equalized Odds": "exponentiated_gradient_eo",
    "Exponentiated Gradient · Equal Opportunity": "exponentiated_gradient_tpr",
    "Threshold Optimizer · Equalized Odds": "threshold_optimizer_eo",
    "Threshold Optimizer · Demographic Parity": "threshold_optimizer_dp",
    "Threshold Optimizer · Equal Opportunity": "threshold_optimizer_tpr",
    "Threshold Optimizer · False Positive Rate Parity": "threshold_optimizer_fpr",
    "Threshold Optimizer · False Negative Rate Parity": "threshold_optimizer_fnr",
}
EFFECTIVENESS_IDS = {"Accuracy": "accuracy", "F1": "f1_macro", "Precision": "precision_macro", "Recall": "recall_macro", "ROC-AUC": "roc_auc", "MAE": "mean_absolute_error", "R²": "r2", "accuracy": "accuracy", "balanced_accuracy": "balanced_accuracy", "f1_macro": "f1_macro", "precision_macro": "precision_macro", "recall_macro": "recall_macro", "roc_auc": "roc_auc", "r2": "r2", "mean_absolute_error": "mean_absolute_error"}
FAIRNESS_IDS = {"Equalized Odds Difference": "equalized_odds_difference", "Statistical Parity Difference": "demographic_parity_difference", "equalized_odds_difference": "equalized_odds_difference", "demographic_parity_difference": "demographic_parity_difference"}


# ---------- Models ----------

class DatasetConfig(BaseModel):
    source: str  # 'builtin' | 'upload'
    name: str
    dataset_id: Optional[str] = None  # set when source == 'upload'
    label_column: Optional[str] = None
    positive_label: Optional[str] = None
    sensitive_attrs: List[str] = []
    columns: List[str] = []


class MetricWeight(BaseModel):
    name: str
    weight: float = 1.0


class TradeoffConfig(BaseModel):
    strategy: str  # 'aggregation' | 'primary_metric' | 'pareto'
    aggregation: Optional[str] = None  # 'mean' | 'weighted_sum' | 'harmonic_mean'
    primary_metric: Optional[str] = None


class ValidationConfig(BaseModel):
    method: str  # 'train_test' | 'kfold' | 'stratified_kfold'
    split: Optional[int] = 80
    k: Optional[int] = 5
    random_seed: int = 42


class ExperimentConfig(BaseModel):
    name: str
    dataset: DatasetConfig
    scaler: str
    task_type: str  # 'classification' | 'regression'
    models: List[str]
    fairness_enabled: bool
    fairness_methods: List[str]
    bias_scope: Optional[str] = None
    group_treatment: Optional[str] = None
    fairness_metrics: List[MetricWeight] = []
    effectiveness_metrics: List[MetricWeight] = []
    tradeoff: TradeoffConfig
    validation: ValidationConfig
    graph_options: List[str] = Field(default_factory=lambda: ["tradeoff_score", "metric_scatter"])
    graph_axes: Dict[str, Dict[str, str]] = Field(default_factory=dict)


class DatasetAnalysisRequest(BaseModel):
    dataset_id: str
    target_column: str
    sensitive_attributes: List[str] = Field(default_factory=list)


class Combination(BaseModel):
    id: str
    model: str
    fairness_method: str
    metrics: Dict[str, float]
    tradeoff_score: float
    pareto_optimal: bool = False
    metric_std: Dict[str, float] = Field(default_factory=dict)
    runtime_seconds: float = 0.0


class ExperimentResults(BaseModel):
    combinations: List[Combination]
    best_id: str
    best_reason: str


class Experiment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    config: ExperimentConfig
    results: ExperimentResults


def _persist_engine_result(config: Dict[str, Any], normalized: Dict[str, Any], engine_result: Dict[str, Any], experiment_id: str, output_dir: Path) -> Dict[str, Any]:
    """Convert engine output to Fairness' result contract and save it for the API."""
    raw_rows = []
    for item in engine_result["results"]:
        metrics = {name: stats["mean"] for name, stats in item["metrics"].items()}
        metric_std = {name: stats["std"] for name, stats in item["metrics"].items()}
        metrics.update({name: value for name, value in item["fairness_metrics"].items() if value is not None})
        raw_rows.append({
            "id": str(uuid.uuid4()),
            "model": item["model_label"],
            "fairness_method": "No Method" if item["fairness_method"] == "none" else item["fairness_method_label"],
            "metrics": metrics,
            "metric_std": metric_std,
            "runtime_seconds": item["evaluation_time_seconds"],
            "tradeoff_score": item["tradeoff_score"],
            "pareto_optimal": item["pareto_optimal"],
        })
    candidates = [row for row in raw_rows if row["pareto_optimal"]] if config["tradeoff"]["strategy"] == "pareto" else raw_rows
    best_row = max(candidates or raw_rows, key=lambda row: row["tradeoff_score"])
    selection_basis = (
        f"the selected primary metric ({engine_result['summary']['primary_metric']})"
        if config["tradeoff"]["strategy"] == "primary_metric"
        else f"the {normalized['tradeoff']['aggregation_function']} score"
        if config["tradeoff"]["strategy"] == "aggregation"
        else "the aggregate score within the Pareto front"
    )
    best_reason = (
        f"{engine_result['summary']['best_config']['model']} paired with "
        f"{engine_result['summary']['best_config']['fairness_method']} ranked highest by {selection_basis} "
        f"(score {best_row['tradeoff_score']:.3f}) using the selected validation workflow."
    )
    experiment = {
        "id": experiment_id,
        "name": config["name"],
        "created_at": engine_result["created_at"],
        "config": config,
        "results": {
            "combinations": raw_rows,
            "best_id": best_row["id"],
            "best_reason": best_reason,
        },
        "integration_metadata": {
            "training_metadata": engine_result["training_metadata"],
            "summary": engine_result["summary"],
            "warnings": engine_result["warnings"],
            "artifact_directory": str(output_dir),
        },
    }
    (output_dir / "reproduce_experiment.py").write_text(_build_run_script(normalized))
    (output_dir / "fairbench_experiment.json").write_text(json.dumps(experiment, indent=2))
    return experiment


# ---------- API Endpoints ----------

@api_router.get("/")
async def root():
    return {"message": "FairBench API"}


MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 50 * 1024 * 1024))


@api_router.post("/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    declared_size = getattr(file, "size", None)
    if declared_size is not None and declared_size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"CSV is too large ({declared_size / 1024 / 1024:.1f} MB). Max allowed: {MAX_UPLOAD_BYTES // 1024 // 1024} MB.",
        )

    chunks: List[bytes] = []
    total = 0
    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"CSV exceeds the {MAX_UPLOAD_BYTES // 1024 // 1024} MB upload limit.",
            )
        chunks.append(chunk)
    raw = b"".join(chunks)

    try:
        df = await asyncio.to_thread(
            lambda: pd.read_csv(io.BytesIO(raw))
        )
    except Exception as ex:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {ex}") from ex

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV contains no rows.")

    df = df.where(pd.notnull(df), None)
    rows = df.to_dict(orient="records")

    dataset_id = str(uuid.uuid4())
    columns = list(df.columns.map(str))
    preview = rows[:5]
    dataset_path = UPLOAD_DIR / f"{dataset_id}.csv"
    df.to_csv(dataset_path, index=False)
    profile = profile_dataset(df, str(df.columns[-1]))
    compatible_models = check_all_models(profile)

    # Store in-memory instead of MongoDB
    UPLOADED_DATASETS[dataset_id] = {
        "id": dataset_id,
        "name": file.filename,
        "columns": columns,
        "rows": rows,
        "path": str(dataset_path),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    (UPLOAD_DIR / f"{dataset_id}.dataset.json").write_text(json.dumps({"id": dataset_id, "name": file.filename, "filename": dataset_path.name, "columns": columns, "uploaded_at": UPLOADED_DATASETS[dataset_id]["uploaded_at"]}, indent=2))
    return {
        "dataset_id": dataset_id,
        "name": file.filename,
        "columns": columns,
        "preview": preview,
        "row_count": len(rows),
        "dataset_path": str(dataset_path.resolve()),
        "profile": profile,
        "models": compatible_models,
        "target_values": df.iloc[:, -1].dropna().drop_duplicates().tolist(),
    }


@api_router.get("/datasets/builtin")
async def list_builtin_datasets():
    datasets = []
    for dataset_id, definition in BUILTIN_DATASETS.items():
        frame = pd.read_csv(DATA_DIR / definition["path"])
        profile = profile_dataset(frame, definition["target"])
        datasets.append({"id": dataset_id, "name": definition["name"], "description": definition["description"], "rows": profile["n_rows"], "columns": frame.columns.tolist(), "task_type": profile["task_type"]})
    return {"datasets": datasets}


@api_router.post("/datasets/builtin/{dataset_id}")
async def use_builtin_dataset(dataset_id: str):
    definition = BUILTIN_DATASETS.get(dataset_id)
    if not definition:
        raise HTTPException(status_code=404, detail="The selected built-in dataset is not available.")
    path = DATA_DIR / definition["path"]
    frame = pd.read_csv(path)
    profile = profile_dataset(frame, definition["target"])
    group_support = profile_sensitive_groups(frame, definition["target"], definition["sensitive"])
    profile["sensitive_groups"] = group_support["groups"]
    profile["warnings"].extend(group_support["warnings"])
    models = check_all_models(profile)
    values = frame[definition["target"]].dropna().drop_duplicates().tolist()
    return {
        "dataset_id": dataset_id, "dataset_path": str(path.resolve()), "name": definition["name"],
        "columns": frame.columns.tolist(), "preview": frame.head(8).where(pd.notnull(frame.head(8)), None).to_dict(orient="records"),
        "row_count": len(frame), "profile": profile, "models": models, "target_values": values,
        "label_column": definition["target"], "sensitive_attrs": definition["sensitive"],
    }

@api_router.post("/datasets/analyze")
async def analyze_dataset(request: DatasetAnalysisRequest):
    uploaded = UPLOADED_DATASETS.get(request.dataset_id)
    if uploaded:
        path = Path(uploaded["path"])
    elif request.dataset_id in BUILTIN_DATASETS:
        path = DATA_DIR / BUILTIN_DATASETS[request.dataset_id]["path"]
    else:
        raise HTTPException(status_code=404, detail="Dataset not found. Upload or select it again.")
    try:
        frame = pd.read_csv(path)
        profile = profile_dataset(frame, request.target_column)
        group_support = profile_sensitive_groups(frame, request.target_column, request.sensitive_attributes)
        profile["sensitive_groups"] = group_support["groups"]
        profile["warnings"].extend(group_support["warnings"])
        return {"profile": profile, "models": check_all_models(profile), "target_values": frame[request.target_column].dropna().drop_duplicates().tolist()}
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@api_router.post("/experiments/run")
async def run_experiment(config: ExperimentConfig):
    if not config.models:
        raise HTTPException(status_code=400, detail="At least one model must be selected.")
    if config.dataset.source == "upload":
        uploaded = UPLOADED_DATASETS.get(config.dataset.dataset_id or "")
        if not uploaded or not Path(uploaded["path"]).is_file():
            raise HTTPException(status_code=400, detail="Uploaded dataset not found. Please re-upload the CSV.")
        dataset_path = uploaded["path"]
    else:
        dataset_id = config.dataset.dataset_id or next((key for key, value in BUILTIN_DATASETS.items() if value["name"] == config.dataset.name), None)
        if dataset_id not in BUILTIN_DATASETS:
            raise HTTPException(status_code=400, detail="Select an available built-in dataset.")
        dataset_path = str((DATA_DIR / BUILTIN_DATASETS[dataset_id]["path"]).resolve())

    try:
        frame = pd.read_csv(dataset_path)
        model_ids = [MODEL_IDS[model] for model in config.models]
        if any(model not in MODEL_IDS for model in config.models):
            raise ValueError("One or more selected models are not supported by the integrated training engine.")
        selected_methods = [method for method in config.fairness_methods if method != "No Method"] if config.fairness_enabled else []
        method_ids = [METHOD_IDS[method] for method in selected_methods]
        metric_ids = [EFFECTIVENESS_IDS[item.name] for item in config.effectiveness_metrics]
        fairness_ids = [FAIRNESS_IDS[item.name] for item in config.fairness_metrics if item.name in FAIRNESS_IDS]
        if config.fairness_enabled and not fairness_ids:
            fairness_ids = ["demographic_parity_difference", "equalized_odds_difference"]
        validation = config.validation
        validation_strategy = {"train_test": "train_test_split", "kfold": "kfold", "stratified_kfold": "stratified_kfold"}.get(validation.method, "stratified_kfold")
        scaler = {"None": "none", "StandardScaler": "standard", "MinMaxScaler": "minmax", "RobustScaler": "robust", "MaxAbsScaler": "maxabs", "Normalizer": "normalize"}.get(config.scaler, "standard")
        aggregation = {"mean": "mean", "mean_normalized": "mean", "weighted_sum": "weighted_sum", "weighted_mean": "weighted_sum", "harmonic_mean": "harmonic_mean", "min": "min"}.get(config.tradeoff.aggregation or "mean", "mean")
        raw_payload = {
            "experiment_name": config.name, "dataset_path": dataset_path,
            "target_column": config.dataset.label_column, "task_type": config.task_type,
            "feature_columns": [column for column in frame.columns if column != config.dataset.label_column],
            "positive_value": config.dataset.positive_label,
            "sensitive_features": config.dataset.sensitive_attrs,
            "preprocessing": {"scaler": scaler}, "models": model_ids,
            "metrics": metric_ids, "fairness_metrics": fairness_ids,
            "metric_weights": {**{EFFECTIVENESS_IDS[m.name]: m.weight for m in config.effectiveness_metrics}, **{FAIRNESS_IDS[m.name]: m.weight for m in config.fairness_metrics if m.name in FAIRNESS_IDS}},
            "fairness_methods": method_ids,
            "tradeoff_strategy": config.tradeoff.strategy,
            "aggregation_function": aggregation,
            "primary_metric": config.tradeoff.primary_metric,
            "graph_options": config.graph_options,
            "graph_axes": config.graph_axes,
            "validation_strategy": validation_strategy, "cv_folds": validation.k,
            "test_size": max(0.1, min(0.5, (100 - (validation.split or 80)) / 100)), "random_seed": validation.random_seed,
        }
        normalized = normalize_experiment_config(raw_payload, str(DATA_DIR.resolve()))
    except (ValueError, KeyError) as ex:
        raise HTTPException(status_code=400, detail=str(ex)) from ex
    experiment_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    normalized.update({"experiment_id": experiment_id, "created_at": created_at})
    output_dir = RESULTS_DIR / experiment_id
    output_dir.mkdir(parents=True)
    (output_dir / "experiment.json").write_text(json.dumps(normalized, indent=2))
    serialized_config = config.model_dump(mode="json")
    (output_dir / "fairbench_config.json").write_text(json.dumps(serialized_config, indent=2))
    (output_dir / "job.json").write_text(json.dumps({
        "experiment_id": experiment_id,
        "status": "PENDING",
        "progress": 0,
        "created_at": created_at,
    }, indent=2))
    try:
        from app.celery_app import celery_app

        celery_app.send_task(
            "app.tasks.run_experiment",
            args=[experiment_id, serialized_config, normalized],
            task_id=experiment_id,
        )
    except Exception as ex:
        logger.exception("Could not queue experiment %s", experiment_id)
        import shutil

        shutil.rmtree(output_dir, ignore_errors=True)
        raise HTTPException(status_code=503, detail="The experiment worker is unavailable. Start the Docker Compose stack and try again.") from ex
    return {"id": experiment_id, "status": "PENDING", "progress": 0}


@api_router.get("/experiments")
async def list_experiments():
    docs = []
    for result_dir in RESULTS_DIR.iterdir():
        if not result_dir.is_dir():
            continue
        completed_path = result_dir / "fairbench_experiment.json"
        config_path = result_dir / "fairbench_config.json"
        job_path = result_dir / "job.json"
        try:
            if completed_path.is_file():
                doc = json.loads(completed_path.read_text())
                EXPERIMENTS[doc["id"]] = doc
            elif config_path.is_file():
                config = json.loads(config_path.read_text())
                job = json.loads(job_path.read_text()) if job_path.is_file() else {}
                doc = {"id": result_dir.name, "name": config.get("name", "Experiment"), "created_at": job.get("created_at", ""), "config": config, "job": job}
            else:
                continue
            docs.append(doc)
        except (OSError, ValueError, KeyError):
            logger.warning("Skipping invalid experiment metadata under %s", result_dir)
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    summaries = []
    for d in docs:
        config = d["config"]
        job = d.get("job") or {}
        results = d.get("results") or {}
        summaries.append({
            "id": d["id"],
            "name": d["name"],
            "created_at": d["created_at"],
            "task_type": config["task_type"],
            "dataset_name": config["dataset"]["name"],
            "model_count": len(config["models"]),
            "method_count": len(config["fairness_methods"]) if config["fairness_enabled"] else 0,
            "combo_count": len(results.get("combinations", [])),
            "status": job.get("status", "SUCCESS"),
            "progress": job.get("progress", 100),
        })
    return summaries


@api_router.get("/experiments/{experiment_id}/status")
async def get_experiment_status(experiment_id: str):
    try:
        experiment_id = str(uuid.UUID(experiment_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Experiment not found")
    result_dir = RESULTS_DIR / experiment_id
    if not result_dir.is_dir() or not (result_dir / "experiment.json").is_file():
        raise HTTPException(status_code=404, detail="Experiment not found")
    job_path = result_dir / "job.json"
    if not job_path.is_file() and (result_dir / "fairbench_experiment.json").is_file():
        return {"id": experiment_id, "status": "SUCCESS", "progress": 100, "error": None}
    try:
        job = json.loads(job_path.read_text())
    except (OSError, ValueError):
        job = {"status": "PENDING", "progress": 0}
    return {
        "id": experiment_id,
        "status": job.get("status", "PENDING"),
        "progress": job.get("progress", 0),
        "error": job.get("error"),
    }


@api_router.get("/experiments/{experiment_id}", response_model=Experiment)
async def get_experiment(experiment_id: str):
    try:
        experiment_id = str(uuid.UUID(experiment_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Experiment not found")
    doc = EXPERIMENTS.get(experiment_id)
    if not doc:
        saved_path = RESULTS_DIR / experiment_id / "fairbench_experiment.json"
        if saved_path.is_file():
            try:
                doc = json.loads(saved_path.read_text())
                EXPERIMENTS[experiment_id] = doc
            except (OSError, ValueError):
                doc = None
        if not doc:
            result_dir = RESULTS_DIR / experiment_id
            if (result_dir / "experiment.json").is_file():
                raise HTTPException(status_code=409, detail="Experiment is still running")
            raise HTTPException(status_code=404, detail="Experiment not found")
    return doc


@api_router.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str):
    try:
        experiment_id = str(uuid.UUID(experiment_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Experiment not found")
    saved_dir = RESULTS_DIR / experiment_id
    if not saved_dir.is_dir():
        raise HTTPException(status_code=404, detail="Experiment not found")
    job_path = saved_dir / "job.json"
    if job_path.is_file():
        try:
            status = json.loads(job_path.read_text()).get("status")
        except (OSError, ValueError):
            status = "PENDING"
        if status in {"PENDING", "RUNNING"}:
            raise HTTPException(status_code=409, detail="A running experiment cannot be deleted.")
    EXPERIMENTS.pop(experiment_id, None)
    import shutil
    shutil.rmtree(saved_dir)
    return {"deleted": experiment_id}


def _build_run_script(config: Dict[str, Any]) -> str:
    request = {
        "experiment_name": config.get("experiment_name", "FairBench experiment"),
        "target_column": config["target_column"], "feature_columns": config["feature_columns"],
        "task_type": config["task_type"], "preprocessing": config["preprocessing"],
        "validation_strategy": config["validation"]["strategy"], "cv_folds": config["validation"]["folds"],
        "test_size": config["validation"].get("test_size", 0.2), "random_seed": config["random_seed"],
        "models": config["models"], "metrics": config["metrics"], "metric_weights": config.get("metric_weights", {}),
        "fairness_metrics": config["fairness_metrics"], "fairness_methods": config.get("fairness_methods", []),
        "sensitive_features": config["sensitive_features"], "positive_value": config.get("positive_value"),
        "tradeoff_strategy": config["tradeoff"]["strategy"], "aggregation_function": config["tradeoff"]["aggregation_function"],
        "primary_metric": config["tradeoff"].get("primary_metric"),
        "graph_options": config.get("graph_options", ["tradeoff_score", "metric_scatter"]),
        "graph_axes": config.get("graph_axes", {}),
    }
    serialized = json.dumps(json.dumps(request, ensure_ascii=False))
    expected_hash = config.get("dataset_sha256")
    return f'''#!/usr/bin/env python3
"""Reproduce this FairBench experiment with its real training engine.
Run from the Fairness/backend directory after installing requirements.txt.
"""
import argparse, hashlib, json, sys
from pathlib import Path
CONFIG = json.loads({serialized})
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
    parser.add_argument("dataset", help="CSV used for the experiment")
    parser.add_argument("--output", default="fairbench-results")
    args = parser.parse_args()
    dataset = Path(args.dataset).expanduser().resolve()
    if not dataset.is_file():
        parser.error(f"Dataset file does not exist: {{dataset}}")
    expected_hash = {expected_hash!r}
    if expected_hash and hashlib.sha256(dataset.read_bytes()).hexdigest() != expected_hash:
        parser.error("Dataset SHA-256 does not match the original experiment.")
    normalized = normalize_experiment_config({{**CONFIG, "dataset_path": str(dataset)}}, str(dataset.parent))
    output = Path(args.output).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    result = run_experiment(normalized, str(output))
    print("Best model:", result["summary"]["best_config"]["model"])
    print("Results written to:", output)
if __name__ == "__main__": main()
'''


@api_router.get("/experiments/{experiment_id}/artifacts/{artifact_name}")
async def download_experiment_artifact(experiment_id: str, artifact_name: str):
    if experiment_id not in EXPERIMENTS:
        raise HTTPException(status_code=404, detail="Experiment not found")
    filenames = {"metrics": "metrics.csv", "model": "best_model.joblib", "configuration": "experiment.json", "script": "reproduce_experiment.py"}
    filename = filenames.get(artifact_name)
    if filename is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    path = RESULTS_DIR / experiment_id / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact is not available for this experiment")
    media_type = "text/csv" if filename.endswith(".csv") else "application/octet-stream"
    return FileResponse(path, media_type=media_type, filename=filename)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "*")],
    allow_methods=["*"],
    allow_headers=["*"],
)
