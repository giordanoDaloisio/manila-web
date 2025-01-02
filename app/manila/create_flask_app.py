from flask import Flask
import logging
import os

def create_flask_app():
    app = Flask(__name__, static_url_path="", static_folder=os.path.join("build"))
    app.config.update(
    CELERY_BROKER_URL='pyamqp://guest@localhost//',  
    CELERY_RESULT_BACKEND='rpc://')
    app.logger.setLevel(logging.INFO)  # Set log level to INFO
    handler = logging.FileHandler("app.log")  # Log to a file
    app.logger.addHandler(handler)
    return app