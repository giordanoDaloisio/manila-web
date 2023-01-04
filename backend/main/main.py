from flask import Flask, request, send_file
from generator.generator import generate
from flask_cors import cross_origin
import os

app = Flask(__name__)


@app.route('/')
def hello():
  return "Hello world"

@app.route('/generate', methods=['POST'])
@cross_origin()
def generate_file():
  params = request.get_json()
  generate(params)
  return send_file(
    os.path.join('..','experiment.zip'), 
    mimetype='zip',
    download_name='experiment.zip')