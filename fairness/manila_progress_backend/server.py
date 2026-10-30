"""

Run:
    uvicorn server:app --reload --port 8000

This version persists datasets/experiments in SQLite + local CSV files and never
replaces failed computations with random metrics.
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import os
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Literal, Optional
import uuid

import pandas as pd
from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator

from training import (
    FAIRLEARN_AVAILABLE,
    data_readiness_report,
    make_demo_hiring_dataset,
    normalize_metric,
    recommend_metrics,
    tradeoff_score,
    train_combination,
)

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("MANILA_DATA_DIR", ROOT / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = Path(os.getenv("MANILA_DB_PATH", DATA_DIR / "manila.sqlite3"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 25 * 1024 * 1024))
MAX_ROWS = int(os.getenv("MAX_ROWS", 100_000))
ALLOWED_ORIGINS = [
    item.strip()
    for item in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    if item.strip()
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("manila.api")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MetricWeight(StrictModel):
    name: str
    weight: float = Field(default=1.0, gt=0, le=100)


class DatasetReference(StrictModel):
    dataset_id: str
    label_column: str
    positive_label: str
    sensitive_attrs: List[str] = Field(min_length=1, max_length=3)


class ReadinessRequest(DatasetReference):
    minimum_group_size: int = Field(default=30, ge=5, le=500)


class RecommendationRequest(StrictModel):
    primary_harm: Literal[
        "qualified_people_rejected",
        "false_negatives",
        "different_error_rates",
        "incorrect_positive_decisions",
        "false_positives",
        "unequal_selection",
        "unequal_access",
        "allocation",
        "general",
    ]
    ground_truth_available: bool
    outcome_is_benefit: bool = True


class ExperimentRequest(StrictModel):
    name: str = Field(min_length=3, max_length=120)
    dataset: DatasetReference
    scaler: Literal["None", "StandardScaler", "MinMaxScaler", "RobustScaler", "MaxAbsScaler"] = "StandardScaler"
    models: List[
        Literal[
            "Logistic Regression",
            "Support Vector Classifier",
            "Gradient Descent Classifier",
            "Gradient Boosting Classifier",
            "Decision Tree Classifier",
            "Random Forest Classifier",
        ]
    ] = Field(min_length=1, max_length=6)
    mitigation_methods: List[
        Literal[
            "No Method",
            "Reweighing",
            "Threshold Optimizer (Equalized Odds)",
        ]
    ] = Field(default_factory=lambda: ["No Method"], min_length=1, max_length=3)
    effectiveness_metrics: List[MetricWeight] = Field(
        default_factory=lambda: [MetricWeight(name="Accuracy"), MetricWeight(name="F1")]
    )
    fairness_metrics: List[MetricWeight] = Field(
        default_factory=lambda: [MetricWeight(name="Demographic Parity Difference")]
    )
    test_size: float = Field(default=0.25, ge=0.1, le=0.5)
    bootstrap_iterations: int = Field(default=100, ge=0, le=1000)
    exclude_sensitive_from_features: bool = True

    @model_validator(mode="after")
    def ensure_unique_items(self):
        if len(set(self.models)) != len(self.models):
            raise ValueError("models must not contain duplicates")
        if len(set(self.mitigation_methods)) != len(self.mitigation_methods):
            raise ValueError("mitigation_methods must not contain duplicates")
        metric_names = [m.name for m in self.effectiveness_metrics + self.fairness_metrics]
        if len(set(metric_names)) != len(metric_names):
            raise ValueError("metric names must not be duplicated")
        return self


class ApiError(StrictModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    request_id: Optional[str] = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def db_connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with db_connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS datasets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                csv_path TEXT NOT NULL,
                row_count INTEGER NOT NULL,
                columns_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS experiments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                request_json TEXT NOT NULL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def save_dataset(name: str, df: pd.DataFrame) -> Dict[str, Any]:
    dataset_id = str(uuid.uuid4())
    path = UPLOAD_DIR / f"{dataset_id}.csv"
    df.to_csv(path, index=False)
    record = {
        "id": dataset_id,
        "name": name,
        "csv_path": str(path),
        "row_count": int(len(df)),
        "columns": [str(c) for c in df.columns],
        "created_at": utc_now(),
    }
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO datasets(id,name,csv_path,row_count,columns_json,created_at) VALUES(?,?,?,?,?,?)",
            (
                record["id"],
                record["name"],
                record["csv_path"],
                record["row_count"],
                json.dumps(record["columns"]),
                record["created_at"],
            ),
        )
    return record


def load_dataset_record(dataset_id: str) -> tuple[Dict[str, Any], pd.DataFrame]:
    with db_connect() as conn:
        row = conn.execute("SELECT * FROM datasets WHERE id=?", (dataset_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "DATASET_NOT_FOUND", "message": "Dataset was not found."})
    record = dict(row)
    path = Path(record["csv_path"])
    if not path.exists():
        raise HTTPException(status_code=410, detail={"code": "DATASET_FILE_MISSING", "message": "Dataset metadata exists but the CSV file is unavailable."})
    return record, pd.read_csv(path)


def save_experiment(name: str, request_data: Dict[str, Any], result: Dict[str, Any]) -> str:
    experiment_id = str(uuid.uuid4())
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO experiments(id,name,request_json,result_json,created_at) VALUES(?,?,?,?,?)",
            (experiment_id, name, json.dumps(request_data), json.dumps(result), utc_now()),
        )
    return experiment_id


def _normalize_for_pareto(metric_name: str, value: Optional[float]) -> Optional[float]:
    return normalize_metric(metric_name, value)


def mark_pareto(combinations: List[Dict[str, Any]], metric_names: List[str]) -> None:
    vectors: List[List[Optional[float]]] = []
    for combination in combinations:
        merged = {**combination["result"]["effectiveness_metrics"], **combination["result"]["fairness_metrics"]}
        vectors.append([_normalize_for_pareto(name, merged.get(name)) for name in metric_names])

    for i, vector_i in enumerate(vectors):
        valid_dimensions = [k for k, value in enumerate(vector_i) if value is not None]
        if not valid_dimensions:
            combinations[i]["pareto_optimal"] = False
            continue
        dominated = False
        for j, vector_j in enumerate(vectors):
            if i == j or any(vector_j[k] is None for k in valid_dimensions):
                continue
            no_worse = all(float(vector_j[k]) >= float(vector_i[k]) for k in valid_dimensions)
            strictly_better = any(float(vector_j[k]) > float(vector_i[k]) for k in valid_dimensions)
            if no_worse and strictly_better:
                dominated = True
                break
        combinations[i]["pareto_optimal"] = not dominated


initialize_database()
app = FastAPI(
    title="MANILA Fairness Analysis API",
    version="1.0.0-meeting-demo",
    description="Real computed fairness experiments with transparent provenance; no generated metric fallbacks.",
)
router = APIRouter(prefix="/api/v1")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": ApiError(code="REQUEST_VALIDATION_FAILED", message="The request configuration is invalid.", details={"issues": exc.errors()}).model_dump()},
    )


@router.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "MANILA Fairness Analysis API",
        "version": app.version,
        "fairlearn_available": FAIRLEARN_AVAILABLE,
        "mock_metric_fallback": False,
    }


@router.post("/datasets/upload", status_code=201)
async def upload_dataset(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail={"code": "UNSUPPORTED_FILE", "message": "Upload a CSV file."})

    chunks: List[bytes] = []
    total = 0
    while chunk := await file.read(1024 * 1024):
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail={"code": "FILE_TOO_LARGE", "message": f"Maximum upload size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."})
        chunks.append(chunk)

    try:
        df = await asyncio.to_thread(pd.read_csv, io.BytesIO(b"".join(chunks)))
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"code": "CSV_PARSE_FAILED", "message": str(exc)}) from exc
    if df.empty:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_DATASET", "message": "The CSV contains no data rows."})
    if len(df) > MAX_ROWS:
        raise HTTPException(status_code=413, detail={"code": "TOO_MANY_ROWS", "message": f"The meeting demo supports up to {MAX_ROWS:,} rows."})

    record = await asyncio.to_thread(save_dataset, file.filename, df)
    return {
        "dataset_id": record["id"],
        "name": record["name"],
        "row_count": record["row_count"],
        "columns": record["columns"],
        "preview": df.head(5).where(pd.notna(df.head(5)), None).to_dict(orient="records"),
    }


@router.post("/datasets/demo", status_code=201)
async def create_demo_dataset() -> Dict[str, Any]:
    df = await asyncio.to_thread(make_demo_hiring_dataset)
    record = await asyncio.to_thread(save_dataset, "synthetic_hiring_demo.csv", df)
    return {
        "dataset_id": record["id"],
        "name": record["name"],
        "row_count": record["row_count"],
        "columns": record["columns"],
        "disclosure": "Synthetic dataset for demonstration; all reported metrics are computed from real model predictions.",
    }


@router.post("/datasets/readiness")
async def readiness(request: ReadinessRequest) -> Dict[str, Any]:
    _, df = await asyncio.to_thread(load_dataset_record, request.dataset_id)
    return await asyncio.to_thread(
        data_readiness_report,
        df,
        label_column=request.label_column,
        positive_label=request.positive_label,
        sensitive_attrs=request.sensitive_attrs,
        minimum_group_size=request.minimum_group_size,
    )


@router.post("/recommendations")
async def metric_recommendation(request: RecommendationRequest) -> Dict[str, Any]:
    try:
        return recommend_metrics(**request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"code": "RECOMMENDATION_NOT_POSSIBLE", "message": str(exc)}) from exc


@router.post("/experiments/run", status_code=201)
async def run_experiment(request: ExperimentRequest) -> Dict[str, Any]:
    _, df = await asyncio.to_thread(load_dataset_record, request.dataset.dataset_id)
    readiness_result = await asyncio.to_thread(
        data_readiness_report,
        df,
        label_column=request.dataset.label_column,
        positive_label=request.dataset.positive_label,
        sensitive_attrs=request.dataset.sensitive_attrs,
    )
    if not readiness_result["ready"]:
        raise HTTPException(status_code=422, detail={"code": "DATA_NOT_READY", "message": "The dataset is not ready for analysis.", "readiness": readiness_result})

    effectiveness_names = [m.name for m in request.effectiveness_metrics]
    fairness_names = [m.name for m in request.fairness_metrics]
    weights = {m.name: m.weight for m in request.effectiveness_metrics + request.fairness_metrics}

    successes: List[Dict[str, Any]] = []
    failures: List[Dict[str, str]] = []
    for model_name in request.models:
        for mitigation_method in request.mitigation_methods:
            try:
                result = await asyncio.to_thread(
                    train_combination,
                    df,
                    label_column=request.dataset.label_column,
                    positive_label=request.dataset.positive_label,
                    sensitive_attrs=request.dataset.sensitive_attrs,
                    scaler_name=request.scaler,
                    model_name=model_name,
                    mitigation_method=mitigation_method,
                    effectiveness_metrics=effectiveness_names,
                    fairness_metrics=fairness_names,
                    test_size=request.test_size,
                    bootstrap_iterations=request.bootstrap_iterations,
                    exclude_sensitive_from_features=request.exclude_sensitive_from_features,
                )
                successes.append(
                    {
                        "combination_id": str(uuid.uuid4()),
                        "model": model_name,
                        "mitigation_method": mitigation_method,
                        "tradeoff_score": tradeoff_score(result, weights),
                        "pareto_optimal": False,
                        "result": result,
                    }
                )
            except Exception as exc:
                logger.exception("Experiment combination failed: %s / %s", model_name, mitigation_method)
                failures.append({"model": model_name, "mitigation_method": mitigation_method, "error": str(exc)})

    if not successes:
        raise HTTPException(status_code=422, detail={"code": "ALL_COMBINATIONS_FAILED", "message": "No model/mitigation combination completed successfully.", "failures": failures})

    mark_pareto(successes, effectiveness_names + fairness_names)
    ranked = sorted(successes, key=lambda item: item["tradeoff_score"] if item["tradeoff_score"] is not None else -1, reverse=True)
    best = ranked[0]
    payload = {
        "status": "completed",
        "readiness": readiness_result,
        "combinations": ranked,
        "failures": failures,
        "best_combination_id": best["combination_id"],
        "best_reason": (
            f"{best['model']} with {best['mitigation_method']} has the highest configured "
            f"weighted trade-off score ({best['tradeoff_score']:.4f}). This is decision support, not an automatic fairness verdict."
        ),
        "audit": {
            "api_version": app.version,
            "created_at": utc_now(),
            "request_configuration": request.model_dump(),
            "mock_values_used": False,
            "human_review_required": True,
        },
    }
    experiment_id = await asyncio.to_thread(save_experiment, request.name, request.model_dump(), payload)
    return {"experiment_id": experiment_id, **payload}


@router.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: str) -> Dict[str, Any]:
    with db_connect() as conn:
        row = conn.execute("SELECT * FROM experiments WHERE id=?", (experiment_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "EXPERIMENT_NOT_FOUND", "message": "Experiment was not found."})
    return {
        "experiment_id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"],
        "request": json.loads(row["request_json"]),
        "result": json.loads(row["result_json"]),
    }


app.include_router(router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)
