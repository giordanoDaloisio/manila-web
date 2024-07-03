import os
from flask import (
    Flask,
    request,
    send_file,
    send_from_directory,
    make_response,
    json,
    Response,
    jsonify,
)
from service.generator import generate_zip, generate_code, run_experiment
from flask_cors import CORS
from flask_restful import Resource, Api
from werkzeug.serving import WSGIRequestHandler
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
import logging
import traceback

WSGIRequestHandler.protocol_version = "HTTP/1.1"
app = Flask(__name__, static_url_path="", static_folder=os.path.join("build"))
api = Api(app)
cors = CORS(app, resources={r"/*": {"origins": "*"}})

# Configure Flask logging
app.logger.setLevel(logging.INFO)  # Set log level to INFO
handler = logging.FileHandler("app.log")  # Log to a file
app.logger.addHandler(handler)


def parse_results(metrics):
    results = {"models": {}, "metrics": {}}
    for k in metrics.keys():
        if k == "fairness_method" or k == "model":
            results["models"][k] = metrics[k]
        else:
            results["metrics"][k] = metrics[k]
    return results


class Homepage(Resource):
    def get(self):
        return send_from_directory(app.static_folder, "index.html")


class Generator(Resource):
    def post(self):
        params = request.get_json()
        zip = generate_zip(params)
        return send_file(zip, mimetype="zip", download_name="experiment.zip")


class Run(Resource):
    def post(self):
        params = request.form.to_dict()
        params.update({"web": "web"})
        data_extension = params.get("extension")
        data = request.files["dataset"].read()
        try:
            metrics, model, pareto = run_experiment(data, data_extension, params)
        except Exception as e:
            app.logger.error(e.with_traceback(traceback.print_exc()))
            message = json.dumps({"error": str(e)})
            return Response(message, status=500, mimetype="application/json")
        results = parse_results(metrics)
        pareto_results = None
        if pareto is not None:
            pareto_results = parse_results(pareto)
        response = make_response(
            {"results": results, "pareto": pareto_results, "model_path": model}, 200
        )
        response.headers["Content-Type"] = "application/json"
        return response


class KeepAlive(Resource):
    def get(self):
        return jsonify({"status": "alive"})


class Model(Resource):
    def get(self, model_name):
        return send_from_directory("models", model_name + ".pkl")


@app.errorhandler(500)
def internal_error(error):
    app.logger.error(error)
    return make_response(jsonify({"error": "Internal Server Error"}), 500)


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
    app.run(debug=True)
