"""Background experiment execution with persisted progress for API polling."""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.celery_app import celery_app
from app.experiment_engine import run_experiment as execute_experiment


LOGGER = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[1]
RESULTS_DIR = Path(os.getenv("RESULTS_DIR", BACKEND_DIR / "results"))


def _write_json(path: Path, value: dict) -> None:
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(json.dumps(value, indent=2, allow_nan=False))
    temporary_path.replace(path)


@celery_app.task(bind=True, name="app.tasks.run_experiment")
def run_experiment(self, experiment_id: str, config: dict, normalized: dict) -> dict:
    result_dir = RESULTS_DIR / experiment_id
    job_path = result_dir / "job.json"
    started_at = datetime.now(timezone.utc).isoformat()

    def update_progress(value: int) -> None:
        progress = max(0, min(100, int(value)))
        try:
            self.update_state(
                state="PROGRESS",
                meta={"experiment_id": experiment_id, "progress": progress},
            )
        except Exception:
            LOGGER.exception("Could not publish Celery progress for %s", experiment_id)
        _write_json(
            job_path,
            {
                "experiment_id": experiment_id,
                "status": "RUNNING",
                "progress": progress,
                "started_at": started_at,
            },
        )

    try:
        _write_json(
            job_path,
            {
                "experiment_id": experiment_id,
                "status": "RUNNING",
                "progress": 0,
                "started_at": started_at,
            },
        )
        update_progress(0)
        engine_result = execute_experiment(
            normalized,
            str(result_dir),
            progress_callback=update_progress,
        )

        # Celery's entry point doesn't always keep the backend root on sys.path
        # in prefork workers, even though the task package itself was imported.
        # Add it before the lazy import so both containers resolve server.py.
        backend_path = str(BACKEND_DIR)
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)

        # Import lazily so loading the worker does not initialize the HTTP app.
        from server import _persist_engine_result

        experiment = _persist_engine_result(
            config=config,
            normalized=normalized,
            engine_result=engine_result,
            experiment_id=experiment_id,
            output_dir=result_dir,
        )
        _write_json(
            job_path,
            {
                "experiment_id": experiment_id,
                "status": "SUCCESS",
                "progress": 100,
                "started_at": started_at,
                "completed_at": engine_result["completed_at"],
            },
        )
        return {"experiment_id": experiment_id}
    except Exception as error:
        LOGGER.exception("Experiment %s failed", experiment_id)
        message = str(error) or "Experiment failed."
        failed_at = datetime.now(timezone.utc).isoformat()
        _write_json(result_dir / "failure.json", {"error": message, "failed_at": failed_at})
        _write_json(
            job_path,
            {
                "experiment_id": experiment_id,
                "status": "FAILURE",
                "progress": 0,
                "started_at": started_at,
                "completed_at": failed_at,
                "error": message,
            },
        )
        raise
