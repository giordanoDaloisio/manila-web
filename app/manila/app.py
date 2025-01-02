import os
from flask_cors import CORS
from flask_restful import Api
from werkzeug.serving import WSGIRequestHandler
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from routes import Homepage, Generator, Run, KeepAlive, Model
from create_flask_app import create_flask_app

WSGIRequestHandler.protocol_version = "HTTP/1.1"

app = create_flask_app()
api = Api(app)
cors = CORS(app, resources={r"/*": {"origins": "*"}})

api.add_resource(Homepage, "/")
api.add_resource(Generator, "/generate")
api.add_resource(Run, "/run")
api.add_resource(KeepAlive, "/keepalive")
api.add_resource(Model, "/model/<string:model_name>")


def clean_models():
    for filename in os.listdir("models"):
        if filename.endswith(".pkl"):
            os.remove(os.path.join("models", filename))


scheduler = BackgroundScheduler()
scheduler.add_job(func=clean_models, trigger="cron", hour=0)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
