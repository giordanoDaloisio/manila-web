from jinja2 import Environment, PackageLoader, select_autoescape
import zipfile
import io
import os
import time
import calendar
import pandas as pd
import shutil
import sys
import importlib

def load_templates():
  env = Environment(loader=PackageLoader('service'),
                      autoescape=select_autoescape(disabled_extensions=(['py','yml'])), 
                      lstrip_blocks=True, 
                      trim_blocks=True)
  main = env.get_template('main.py.jinja')
  utils = env.get_template('utils.py.jinja')
  demv = env.get_template('demv.py.jinja')
  environment = env.get_template('environment.yml.jinja')
  metrics = env.get_template('metrics.py.jinja')
  trainer = env.get_template('model_trainer.py.jinja')
  methods = env.get_template('methods.py.jinja')
  charts = env.get_template('charts.py.jinja')
  experiment = env.get_template('experiment.py.jinja')
  return main,utils,demv,environment,metrics,trainer,methods,charts,experiment

def generate_zip(params):
  main,utils,demv,environment,metrics,trainer,methods,charts,experiment = load_templates()
  mem_file = io.BytesIO()
  with zipfile.ZipFile(mem_file, 'w', compression=zipfile.ZIP_STORED) as zip:
    zip.writestr(zinfo_or_arcname='main.py', data=main.render(params))
    zip.writestr(zinfo_or_arcname='utils.py', data=utils.render(params))
    zip.writestr(zinfo_or_arcname='environment.yml', data=environment.render(params))
    zip.writestr(zinfo_or_arcname='metrics.py', data=metrics.render(params))
    zip.writestr(zinfo_or_arcname='model_trainer.py', data=trainer.render(params))
    zip.writestr(zinfo_or_arcname='methods.py', data=methods.render(params))
    zip.writestr(zinfo_or_arcname='experiment.py',data=experiment.render(params))
    if('demv' in params):
      zip.writestr(zinfo_or_arcname='demv.py', data=demv.render(params))
    if('chart' in params):
      zip.writestr(zinfo_or_arcname='charts.py', data=charts.render(params))
  mem_file.seek(0)
  return mem_file

def generate_code(params):
  _,utils,demv,environment,metrics,trainer,methods,charts,experiment = load_templates()
  current_GMT = time.gmtime()
  time_stamp = calendar.timegm(current_GMT)
  folder_name = 'code_'+str(time_stamp)
  os.makedirs(folder_name, exist_ok=True)
  with open(os.path.join(folder_name, 'experiment.py'), 'w') as f:
    f.write(experiment.render(params))
  with open(os.path.join(folder_name, 'utils.py'), 'w') as f:
    f.write(utils.render(params))
  with open(os.path.join(folder_name, 'environment.yml'), 'w') as f:
    f.write(environment.render(params))
  with open(os.path.join(folder_name, 'metrics.py'), 'w') as f:
    f.write(metrics.render(params))
  with open(os.path.join(folder_name, 'model_trainer.py'), 'w') as f:
    f.write(trainer.render(params))
  with open(os.path.join(folder_name, 'methods.py'), 'w') as f:
    f.write(methods.render(params))
  if 'demv' in params:
    with open(os.path.join(folder_name, 'demv.py'), 'w') as f:
      f.write(demv.render())
  if 'chart' in params:
    with open(os.path.join(folder_name,'charts.py'), 'w') as f:
      f.write(charts.render())
  return folder_name

def run_experiment(dataset, path, extension):
  sys.path.append(path)
  data = None
  if extension == 'csv':
    data = pd.read_csv(io.BytesIO(dataset), encoding='latin1')
  elif extension == 'parquet':
    data = pd.read_parquet(io.BytesIO(dataset), encoding='latin1')
  elif extension == 'excel':
    data = pd.read_excel(io.BytesIO(dataset))
  elif extension == 'json':
    data = pd.read_json(io.BytesIO(dataset), encoding='latin1')
  elif extension == 'text':
    data = pd.read_fwf(io.BytesIO(dataset), encoding='latin1')
  elif extension == 'html':
    data = pd.read_html(io.StringIO(dataset), encoding='latin1')
  elif extension == 'xml':
    data = pd.read_xml(io.BytesIO(dataset), encoding='latin1')
  elif extension == 'hdf5':
    data = pd.read_hdf(pd.HDFStore(dataset), encoding='latin1')
  assert dataset != None, "Invalid dataset"
  import experiment
  experiment = importlib.reload(experiment)
  model, metrics = experiment.run_exp(data)
  shutil.rmtree(path)
  return metrics.to_json()