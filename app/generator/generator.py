from jinja2 import Environment, PackageLoader, select_autoescape
import zipfile
import io

def load_templates():
  env = Environment(loader=PackageLoader('generator'),
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