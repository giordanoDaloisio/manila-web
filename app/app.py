import os
from flask import Flask, request, send_file, send_from_directory, make_response,jsonify, abort
from service.generator import generate_zip, generate_code, run_experiment
from flask_cors import CORS
from flask_restful import Resource, Api

app = Flask(__name__, static_url_path='', static_folder=os.path.join('build'))
api = Api(app)
cors = CORS(app, resources={r"/*": {"origins": "*"}})
class Homepage(Resource):
  def get(self):
    return send_from_directory(app.static_folder, 'index.html')

class Generator(Resource):
  def post(self):
    params = request.get_json()
    zip = generate_zip(params)
    return send_file(
      zip, 
      mimetype='zip',
      download_name='experiment.zip')

class Run(Resource):
  def post(self):
      params = request.form.to_dict()
      params.update({'web': 'web'})
      data_extension = params.get('extension')
      data = request.files['dataset'].read()
      try:
        folder_name = generate_code(params)
        metrics, model = run_experiment(data, folder_name, data_extension)
      except Exception as e:
        app.logger.error(e.with_traceback(e.__traceback__).args)
        return jsonify({'error': str(e)}), 500
      results = {'models': {}, 'metrics': {}}
      for k in metrics.keys():
        if k == 'fairness_method' or k == 'model':
          results['models'][k] = metrics[k]
        else:
          results['metrics'][k] = metrics[k]
      response = make_response({'results': results, 'model_path': model}, 200)
      response.headers['Content-Type'] = 'application/json'
      return response

api.add_resource(Homepage, '/')
api.add_resource(Generator, '/generate')
api.add_resource(Run, '/run')

if __name__ == '__main__':
  app.run(debug=True)