from flask import Flask
from celery_app import make_celery
import logging
import os

def create_flask_app():
    app = Flask(__name__, static_url_path="", static_folder=os.path.join("build"))
    app.config.update(
        CELERY_BROKER_URL="pyamqp://guest@rabbitmq//", 
        CELERY_RESULT_BACKEND="rpc://"
    )
    app.logger.setLevel(logging.INFO)  # Set log level to INFO
    handler = logging.FileHandler("app.log")  # Log to a file
    app.logger.addHandler(handler)
    celery = make_celery(app)
    app.config["CELERY"] = celery
    return app