from celery import Celery
from flask import Flask
import os

def make_celery(app: Flask):

    celery = Celery(
        app.import_name,
        broker="pyamqp://guest@rabbitmq//",
        backend="rpc://",
        include=['service.generator'],
    )
    # celery.Task = ContextTask
    celery.conf.update(app.config)
    celery.set_default()
    return celery
