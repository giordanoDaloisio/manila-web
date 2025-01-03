from flask import request, jsonify, send_file, send_from_directory, Response, make_response
from flask_restful import Resource
from service.generator import generate_zip, run_experiment
import json
from create_flask_app import create_flask_app
from celery.result import AsyncResult

app = create_flask_app()
celery = app.config["CELERY"]

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
            exp_id = run_experiment.delay(data, data_extension, params)
            return jsonify({"exp_id": exp_id.id})
        except Exception as e:
            # app.logger.error(e.with_traceback(traceback.print_exc()))
            message = json.dumps({"error": str(e)})
            return Response(message, status=500, mimetype="application/json")

class Status(Resource):
    def get(self, exp_id):
        exp_res = AsyncResult(exp_id, app=celery)
        if exp_res.state == "PENDING":
            response = make_response(jsonify({"state": "PENDING"}), 200)
            response.headers["Content-Type"] = "application/json"
            return response
        if exp_res.state == "FAILURE":
            response = make_response(jsonify({"state": exp_res.info}), 500)
            response.headers["Content-Type"] = "application/json"
            return response
        if exp_res.state == "SUCCESS":
            results = parse_results(exp_res.metrics)
            pareto_results = None
            if exp_res.pareto is not None:
                pareto_results = parse_results(exp_res.pareto)
            response = make_response(
                {"results": results, "pareto": pareto_results, "model_path": exp_res.model_name}, 200
            )
            response.headers["Content-Type"] = "application/json"
            return response
        response = make_response(jsonify({"state": exp_res.state}), 200)


class KeepAlive(Resource):
    def get(self):
        return jsonify({"status": "alive"})


class Model(Resource):
    def get(self, model_name):
        print(model_name)
        return send_from_directory("models", model_name + ".pkl")

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(error)
    return make_response(jsonify({"error": "Internal Server Error"}), 500)