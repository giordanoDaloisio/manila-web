import calendar
import io
import os
import sys
import time
import zipfile
from service.experiment import experiment
from typing import List, Union, Optional
from dataclasses import dataclass
from celery import shared_task
from celery.utils.log import get_task_logger
import pandas as pd
from jinja2 import Environment, PackageLoader, select_autoescape
import dill

logger = get_task_logger(__name__)


def load_templates():
    env = Environment(
        loader=PackageLoader("service"),
        autoescape=select_autoescape(disabled_extensions=(["py", "yml"])),
        lstrip_blocks=True,
        trim_blocks=True,
    )
    main = env.get_template("main.py.jinja")
    utils = env.get_template("utils.py.jinja")
    environment = env.get_template("environment.yml.jinja")
    metrics = env.get_template("metrics.py.jinja")
    trainer = env.get_template("model_trainer.py.jinja")
    methods = env.get_template("methods.py.jinja")
    charts = env.get_template("charts.py.jinja")
    experiment = env.get_template("experiment.py.jinja")
    return main, utils, environment, metrics, trainer, methods, charts, experiment


def generate_zip(params):
    (
        main,
        utils,
        environment,
        metrics,
        trainer,
        methods,
        charts,
        experiment,
    ) = load_templates()
    mem_file = io.BytesIO()
    with zipfile.ZipFile(mem_file, "w", compression=zipfile.ZIP_STORED) as zip:
        zip.writestr(zinfo_or_arcname="main.py", data=main.render(params))
        zip.writestr(zinfo_or_arcname="utils.py", data=utils.render(params))
        zip.writestr(
            zinfo_or_arcname="environment.yml", data=environment.render(params)
        )
        zip.writestr(zinfo_or_arcname="metrics.py", data=metrics.render(params))
        zip.writestr(zinfo_or_arcname="model_trainer.py", data=trainer.render(params))
        zip.writestr(zinfo_or_arcname="methods.py", data=methods.render(params))
        zip.writestr(zinfo_or_arcname="experiment.py", data=experiment.render(params))
        if "chart" in params:
            zip.writestr(zinfo_or_arcname="charts.py", data=charts.render(params))
    mem_file.seek(0)
    return mem_file


def generate_code(params):
    (
        _,
        utils,
        environment,
        metrics,
        trainer,
        methods,
        charts,
        experiment,
    ) = load_templates()
    current_GMT = time.gmtime()
    time_stamp = calendar.timegm(current_GMT)
    folder_name = "code_" + str(time_stamp)
    os.makedirs(folder_name, exist_ok=True)
    with open(os.path.join(folder_name, "experiment.py"), "w") as f:
        f.write(experiment.render(params))
    with open(os.path.join(folder_name, "utils.py"), "w") as f:
        f.write(utils.render(params))
    with open(os.path.join(folder_name, "environment.yml"), "w") as f:
        f.write(environment.render(params))
    with open(os.path.join(folder_name, "metrics.py"), "w") as f:
        f.write(metrics.render(params))
    with open(os.path.join(folder_name, "model_trainer.py"), "w") as f:
        f.write(trainer.render(params))
    with open(os.path.join(folder_name, "methods.py"), "w") as f:
        f.write(methods.render(params))
    if "chart" in params:
        with open(os.path.join(folder_name, "charts.py"), "w") as f:
            f.write(charts.render())
    return folder_name


def run_experiment(dataset, extension, params: dict):
    data = None
    if extension == "csv":
        data = pd.read_csv(io.BytesIO(dataset), encoding="latin1")
    elif extension == "parquet":
        data = pd.read_parquet(io.BytesIO(dataset), encoding="latin1")
    elif extension == "excel":
        data = pd.read_excel(io.BytesIO(dataset))
    elif extension == "json":
        data = pd.read_json(io.BytesIO(dataset), encoding="latin1")
    elif extension == "text":
        data = pd.read_fwf(io.BytesIO(dataset), encoding="latin1")
    elif extension == "html":
        data = pd.read_html(io.StringIO(dataset), encoding="latin1")
    elif extension == "xml":
        data = pd.read_xml(io.BytesIO(dataset), encoding="latin1")
    elif extension == "hdf5":
        # For HDF5, you typically need a file-like object. 
        # If your dataset_bytes is truly an HDF5 file, something like this might work:
        with pd.HDFStore(io.BytesIO(dataset_bytes)) as store:
            # You'll need to know which key(s) to load. Example: 'df'
            if 'df' in store.keys():
                return store['df']
            else:
                raise ValueError("No 'df' key found in HDFStore.")
    else:
        raise ValueError(f"Unsupported extension: '{extension}'")


def save_model(model, model_name: str, directory: str = "models") -> None:
    """
    Saves the given model object to a pickle file in the specified directory.
    Creates the directory if it doesn't exist.
    """

    os.makedirs(directory, exist_ok=True)
    filepath = os.path.join(directory, f"{model_name}.pkl")
    with open(filepath, "wb") as f:
        dill.dump(model, f)

@shared_task(bind=True)
def run_experiment(self, dataset_bytes: bytes, extension: str, params: dict) -> ExperimentResult:
    """
    High-level function that:
      1. Loads the data into a Pandas DataFrame.
      2. Spins up a keep_alive thread (if needed).
      3. Runs the experiment and saves resulting model(s).
      4. Returns metrics, model_name(s), and optionally pareto.

    For a production environment with multiple or large experiments, 
    consider using a background queue (e.g., Celery) instead of threads.
    """
    try:
        # 1) Load Data
        data = load_data(dataset_bytes, extension)

        # 3) Run the experiment
        model, metrics, pareto = experiment.run_exp(data, self, params)

        # 4) Generate a timestamp for unique file naming
        current_gmt = time.gmtime()
        time_stamp = calendar.timegm(current_gmt)
        logger.info(f"Time stamp: {time_stamp}")
        # 5) Save model(s)
        if isinstance(model, list):
            # Multiple models scenario
            model_names = []
            for i, m in enumerate(model):
                current_GMT = time.gmtime()
                time_stamp = calendar.timegm(current_GMT)
                if "fairness_method" in pareto.columns:
                    m_name = f"{pareto.loc[i,'model']}_{pareto.loc[i,'fairness_method']}_{time_stamp}"
                else:
                    m_name = pareto.loc[i, "model"] + "_" + str(time_stamp)
                model_name.append(m_name)
                os.makedirs("models", exist_ok=True)
                pickle.dump(m, open(os.path.join("models", m_name + ".pkl"), "wb"))
        else:
            current_GMT = time.gmtime()
            time_stamp = calendar.timegm(current_GMT)
            if "fairness_method" in metrics.columns:
                model_name = f"{metrics.loc[0,'model']}_{metrics.loc[0,'fairness_method']}_{time_stamp}"
            else:
                model_name = f"{metrics.loc[0,'model']}_{time_stamp}" if metrics is not None else f"model_{time_stamp}"
            logger.info(f"Saving model as {model_name}")
            save_model(model, model_name)
            final_model_name = model_name

        # 7) Build return object
        if pareto is not None:
            res = ExperimentResult(
                metrics=metrics.to_dict(),
                model_name=final_model_name,
                pareto=pareto.to_dict()
            )
        else:
            res = ExperimentResult(
                metrics=metrics.to_dict() if metrics is not None else {},
                model_name=final_model_name,
                pareto=None
            )
        return {
            "metrics": res.metrics,
            "model_name": res.model_name,
            "pareto": res.pareto
        }

    except ValueError as ve:
        # Handle known data loading or value errors
        sys.modules.pop(experiment.__name__, None)
        raise ve
    except IOError as ioe:
        # Handle known file I/O errors
        sys.modules.pop(experiment.__name__, None)
        raise ioe
    except Exception as e:
        sys.modules.pop(experiment.__name__, None)
        raise e
