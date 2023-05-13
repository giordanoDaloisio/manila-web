import os
import pickle
from copy import deepcopy
import utils
import model_trainer
from datetime import datetime
from methods import FairnessMethods
from demv import DEMV
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import importlib

utils = importlib.reload(utils)
model_trainer = importlib.reload(model_trainer)

from utils import *
from model_trainer import ModelTrainer

base_metrics = {
    "stat_par": [],
    "eq_odds": [],
    "disp_imp": [],
    "ao": [],
    "acc": [],
    "hmean": [],
}


def _store_metrics(metrics, method, fairness, save_data, save_model, model_fair):
    df_metrics = pd.DataFrame(metrics)
    df_metrics = df_metrics.explode(list(df_metrics.columns))
    df_metrics["model"] = method
    df_metrics["fairness_method"] = fairness
    if save_data:
        os.makedirs("ris", exist_ok=True)
        df_metrics.to_csv(os.path.join("ris", f"ris_{method}_{fairness}.csv"))
    if save_model:
        os.makedirs("ris", exist_ok=True)
        pickle.dump(
            model_fair,
            open(os.path.join("ris", f"{method}_{fairness}_partial.pickle"), "wb"),
        )
    return df_metrics


def run_exp(data):
    return {"a": 1, "b": 2}, "world"
