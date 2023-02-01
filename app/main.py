import os
from flask import Flask, request, send_file, send_from_directory, make_response
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
  data = request.files['dataset'].read()
  folder_name = generate_code(params)
  metrics = run_experiment(data, folder_name)
  response = make_response(metrics, 200)
  response.headers['Content-Type'] = 'application/json'
  return response

if __name__ == '__main__':
  app.run(debug=True)