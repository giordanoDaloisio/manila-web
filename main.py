from flask import Flask, request, send_file, send_from_directory
from generator.generator import generate
from flask_cors import cross_origin
import os

app = Flask(__name__, static_url_path='', static_folder=os.path.join('frontend','build'))


@app.route('/')
def hello():
  return send_from_directory(app.static_folder, 'index.html')

@app.route('/generate', methods=['POST'])
@cross_origin()
def generate_file():
  params = request.get_json()
  zip = generate(params)
  return send_file(
    zip, 
    mimetype='zip',
    download_name='experiment.zip')

if __name__ == '__main__':
  app.run(debug=True)