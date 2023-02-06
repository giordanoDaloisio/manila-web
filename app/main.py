import os
from flask import Flask, request, send_file, send_from_directory, make_response,jsonify, abort
from service.generator import generate_zip, generate_code, run_experiment
from flask_cors import cross_origin

app = Flask(__name__, static_url_path='', static_folder=os.path.join('build'))

@app.route('/')
def hello():
  return send_from_directory(app.static_folder, 'index.html')

@app.route('/generate', methods=['POST'])
@cross_origin()
def generate_file():
  params = request.get_json()
  zip = generate_zip(params)
  return send_file(
    zip, 
    mimetype='zip',
    download_name='experiment.zip')

@app.route('/run', methods=['POST'])
@cross_origin()
def run():
    params = request.form.to_dict()
    params.update({'web': 'web'})
    data_extension = params.get('extension')
    data = request.files['dataset'].read()
    folder_name = generate_code(params)
    metrics, model = run_experiment(data, folder_name, data_extension)
    results = {'models': {}, 'metrics': {}}
    for k in metrics.keys():
      print(k)
      if k == 'fairness_method' or k == 'model':
        results['models'][k] = metrics[k]
      else:
        results['metrics'][k] = metrics[k]
    response = make_response({'results': results, 'model_path': model}, 200)
    response.headers['Content-Type'] = 'application/json'
    return response

@app.errorhandler(500)
def error_handler(e):
  return jsonify(str(e)),500

if __name__ == '__main__':
  app.run(debug=True)