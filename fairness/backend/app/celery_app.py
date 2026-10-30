"""Celery application shared by the API and the experiment worker."""

import os

from celery import Celery


celery_app = Celery(
    "fairbench",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
)
celery_app.conf.update(
    imports=("app.tasks",),
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=("json",),
    result_expires=60 * 60 * 24,
    broker_connection_retry_on_startup=True,
    task_publish_retry=False,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
)
