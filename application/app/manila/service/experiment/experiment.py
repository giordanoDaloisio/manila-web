import os
import pickle
from copy import deepcopy
from service.experiment.model_trainer import ModelTrainer
from datetime import datetime
from service.experiment.methods import FairnessMethods
import pandas as pd
import numpy as np
import copy

from service.experiment.charts import Charts
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import SGDClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.preprocessing import MinMaxScaler
from sklearn.preprocessing import MaxAbsScaler
from sklearn.preprocessing import RobustScaler
from sklearn.preprocessing import QuantileTransformer
from sklearn.preprocessing import PowerTransformer
from sklearn.linear_model import LinearRegression
from sklearn.svm import SVR
from sklearn.linear_model import SGDRegressor
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.tree import DecisionTreeRegressor


from service.experiment.utils import *
from service.experiment.model_trainer import ModelTrainer


def identify_pareto_front(data):
    data = copy.deepcopy(data)
    if "acc" in data.columns:
        data["acc"] = -data["acc"]
    if "f1_score" in data.columns:
        data["f1_score"] = -data["f1_score"]
    if "auc" in data.columns:
        data["auc"] = -data["auc"]
    if "precision" in data.columns:
        data["precision"] = -data["precision"]
    if "recall" in data.columns:
        data["recall"] = -data["recall"]
    if "disp_imp" in data.columns:
        data["disp_imp"] = -data["disp_imp"]
    if "stat_par" in data.columns:
        data["stat_par"] = data["stat_par"].abs()
    if "eq_odds" in data.columns:
        data["eq_odds"] = data["eq_odds"].abs()
    if "ao" in data.columns:
        data["ao"] = data["ao"].abs()
    if "zero_one_loss" in data.columns:
        data["zero_one_loss"] = data["zero_one_loss"].abs()
    if "tpr_diff" in data.columns:
        data["tpr_diff"] = data["tpr_diff"].abs()
    if "fpr_diff" in data.columns:
        data["fpr_diff"] = data["fpr_diff"].abs()
    is_pareto = np.ones(data.shape[0], dtype=bool)
    for i in range(data.shape[0]):
        for j in range(data.shape[0]):
            if all(data.iloc[j].round(2) <= data.iloc[i].round(2)) and any(
                data.iloc[j].round(2) < data.iloc[i].round(2)
            ):
                is_pareto[i] = False
                break
    return np.where(is_pareto)[0]


def get_base_metrics(params: dict):
    base_metrics = {}
    if "precision" in params:
        base_metrics["precision"] = []
    if "recall" in params:
        base_metrics["recall"] = []
    if "f1_score" in params:
        base_metrics["f1_score"] = []
    if "auc" in params:
        base_metrics["auc"] = []
    if "statistical_parity" in params:
        base_metrics["stat_par"] = []
    if "equalized_odds" in params:
        base_metrics["eq_odds"] = []
    if "zero_one_loss" in params:
        base_metrics["zero_one_loss"] = []
    if "disparate_impact" in params:
        base_metrics["disp_imp"] = []
    if "average_odds" in params:
        base_metrics["ao"] = []
    if "true_positive_difference" in params:
        base_metrics["tpr_diff"] = []
    if "false_positive_difference" in params:
        base_metrics["fpr_diff"] = []
    if "accuracy" in params:
        base_metrics["acc"] = []
    if "euclidean_distance" in params:
        base_metrics["euclidean_distance"] = []
    if "manhattan_distance" in params:
        base_metrics["manhattan_distance"] = []
    if "mahalanobis_distance" in params:
        base_metrics["mahalanobis_distance"] = []
    if "harmonic_mean" in params:
        base_metrics["hmean"] = []
    if "max" in params:
        base_metrics["max"] = []
    if "min" in params:
        base_metrics["min"] = []
    if "statistical_mean" in params:
        base_metrics["mean"] = []
    if "weighted_mean" in params:
        base_metrics["weighted_mean"] = []
    return base_metrics


def get_scaler(param):
    scaler = None
    if param.get("standard_scaler"):
        scaler = StandardScaler()
    elif param.get("min_max_scaler"):
        scaler = MinMaxScaler()
    elif param.get("max_abs_scaler"):
        scaler = MaxAbsScaler()
    elif param.get("robust_scaler"):
        scaler = RobustScaler()
    elif param.get("quantile_transformer_scaler"):
        scaler = QuantileTransformer()
    elif param.get("power_transformer_scaler"):
        method = (
            "yeo-johnson"
            if param.get("yeo_johnson_method")
            else "box-cox" if param.get("box_cox_method") else "yeo-johnson"
        )
        scaler = PowerTransformer(method=method)
    return scaler


def train_final_model(
    params, data, label, sensitive_features, positive_label, best_ris, model
):
    if params.get("scaler"):
        model = Pipeline([("scaler", params.get("scaler")), ("classifier", model)])
    if params.get("fairness"):
        trainer = ModelTrainer(data, label, sensitive_features, positive_label, params)
        if best_ris["fairness_method"] == FairnessMethods.NO_ONE.name:
            model.fit(data.drop(label, axis=1), data[label])
            return model
        if best_ris["fairness_method"] == FairnessMethods.DEMV.name:
            demv = trainer.use_demv(model)
            return demv
        if best_ris["fairness_method"] == FairnessMethods.RW.name:
            rw = trainer.use_rw(model)
            return rw
        if best_ris["fairness_method"] == FairnessMethods.DIR.name:
            dir = trainer.use_dir(model)
            return dir
        if best_ris["fairness_method"] == FairnessMethods.EG.name:
            eg = trainer.use_eg(model)
            return eg
        if best_ris["fairness_method"] == FairnessMethods.GRID.name:
            grid = trainer.use_grid(model)
            return grid
        if best_ris["fairness_method"] == FairnessMethods.GERRY.name:
            gerry = trainer.use_gerry()
            return gerry
        if best_ris["fairness_method"] == FairnessMethods.META.name:
            meta = trainer.use_meta()
            return meta
        if best_ris["fairness_method"] == FairnessMethods.PREJ.name:
            prej = trainer.use_prj()
            return prej
        if best_ris["fairness_method"] == FairnessMethods.CAL_EO.name:
            cal = trainer.use_cal_eo(model)
            return cal
        if best_ris["fairness_method"] == FairnessMethods.REJ.name:
            rej = trainer.use_rej_opt(model)
            return rej
    else:
        model.fit(data.drop(label, axis=1).values, data[label].values.ravel())
        return model


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


def run_exp(data, task, params: dict):
    label = params["name"]
    positive_label = params["positive_value"]
    base_metrics = get_base_metrics(params)

    if "single_sensitive_var" in params:
        unpriv_group = {params["variable_name"]: int(params["unprivileged_value"])}
        priv_group = {params["variable_name"]: int(params["privileged_value"])}
        sensitive_features = [params["variable_name"]]
    elif "multiple_sensitive_vars" in params:
        variables = params["variable_names"].split(",")
        privileged_values = params["privileged_values"].split(",")
        unprivileged_values = params["unprivileged_values"].split(",")
        priv_group = {variables[i]: privileged_values[i] for i in range(len(variables))}
        unpriv_group = {
            variables[i]: unprivileged_values[i] for i in range(len(variables))
        }
        sensitive_features = variables
    else:
        unpriv_group = []
        priv_group = []
        sensitive_features = []

    save_data = True if params.get("save_data") else False

    save_model = True if params.get("save_model") else False

    ml_methods = {}
    fairness_methods = {}

    if "logistic__regression" in params:
        ml_methods["logreg"] = LogisticRegression()
    if "svc" in params:
        ml_methods["svm"] = SVC()
    if "gradient__boosting__classifier" in params:
        ml_methods["gradient_class"] = GradientBoostingClassifier()
    if "mlp__classifier" in params:
        ml_methods["mlp"] = MLPClassifier()
    if "gradient__descent__classifier" in params:
        ml_methods["sdgclass"] = SGDClassifier()
    if "decision__tree__classifier" in params:
        ml_methods["tree"] = DecisionTreeClassifier()
    if "random__forest__classifier" in params:
        ml_methods["forest"] = RandomForestClassifier()
    if "linear__regression" in params:
        ml_methods["linreg"] = LinearRegression()
    if "svr" in params:
        ml_methods["svr"] = SVR()
    if "gradient__descent__regressor" in params:
        ml_methods["sdgreg"] = SGDRegressor()
    if "gradient__boosting__regressor" in params:
        ml_methods["gradient_reg"] = GradientBoostingRegressor()
    if "mlp__regressor" in params:
        ml_methods["mlp_reg"] = MLPRegressor()
    if "decision__tree__regressor" in params:
        ml_methods["tree_reg"] = DecisionTreeRegressor()

    fairness_methods = {
        "no_method": FairnessMethods.NO_ONE if params.get("no__method") else None,
        "preprocessing": [
            FairnessMethods.DEMV if params.get("demv") else None,
            FairnessMethods.RW if params.get("reweighing") else None,
            FairnessMethods.DIR if params.get("dir") else None,
        ],
        "inprocessing": [
            FairnessMethods.EG if params.get("exponentiated_gradient") else None,
            FairnessMethods.GRID if params.get("grid_search") else None,
            FairnessMethods.AD if params.get("adversarial_debiasing") else None,
            FairnessMethods.GERRY if params.get("gerry_fair_classifier") else None,
            FairnessMethods.META if params.get("meta_fair_classifier") else None,
            FairnessMethods.PREJ if params.get("prejudice_remover") else None,
        ],
        "postprocessing": [
            FairnessMethods.CAL_EO if params.get("calibrated_eo") else None,
            FairnessMethods.REJ if params.get("reject_option_classifier") else None,
        ],
    }

    # Remove None values from lists
    fairness_methods["preprocessing"] = [
        method for method in fairness_methods["preprocessing"] if method is not None
    ]
    fairness_methods["inprocessing"] = [
        method for method in fairness_methods["inprocessing"] if method is not None
    ]
    fairness_methods["postprocessing"] = [
        method for method in fairness_methods["postprocessing"] if method is not None
    ]
    if fairness_methods["no_method"] is None:
        fairness_methods.pop("no_method")

    agg_metric = params.get("agg_metric")
    pareto = params.get("pareto_front")

    total_runs = len(ml_methods.keys()) * len(fairness_methods.keys()) if len(fairness_methods.keys()) > 0 else len(ml_methods.keys())
    ris = pd.DataFrame()
    step = 0
    for m in ml_methods.keys():
        if (
            params.get("standard_scaler")
            or params.get("min_max_scaler")
            or params.get("max_abs_scaler")
            or params.get("robust_scaler")
            or params.get("quantile_transformer_scaler")
            or params.get("power_transformer_scaler")
        ):
            model = Pipeline(
                [("scaler", get_scaler(params)), ("classifier", ml_methods[m])]
            )
        else:
            model = ml_methods[m]

        # Training-testing
        if params.get("fairness"):
            for f in fairness_methods.keys():
                model = deepcopy(model)
                data_copy = data.copy()
                if f == "preprocessing":
                    for method in fairness_methods[f]:
                        metrics = deepcopy(base_metrics)
                        model_fair, ris_metrics = cross_val(
                            classifier=model,
                            data=data_copy,
                            unpriv_group=unpriv_group,
                            priv_group=priv_group,
                            label=label,
                            metrics=metrics,
                            positive_label=positive_label,
                            sensitive_features=sensitive_features,
                            preprocessor=method,
                            n_splits=params.get("K", 10),
                            params=params,
                        )
                        df_metrics = _store_metrics(
                            ris_metrics,
                            m,
                            method.name,
                            save_data,
                            save_model,
                            model_fair,
                        )
                        ris = ris.append(df_metrics)
                elif f == "inprocessing":
                    for method in fairness_methods[f]:
                        metrics = deepcopy(base_metrics)
                        model_fair, ris_metrics = cross_val(
                            classifier=model,
                            data=data_copy,
                            unpriv_group=unpriv_group,
                            priv_group=priv_group,
                            label=label,
                            metrics=metrics,
                            positive_label=positive_label,
                            sensitive_features=sensitive_features,
                            inprocessor=method,
                            n_splits=params.get("K", 10),
                            params=params,
                        )
                        df_metrics = _store_metrics(
                            ris_metrics,
                            m,
                            method.name,
                            save_data,
                            save_model,
                            model_fair,
                        )
                        ris = ris.append(df_metrics)
                elif f == "postprocessing":
                    for method in fairness_methods[f]:
                        metrics = deepcopy(base_metrics)
                        model_fair, ris_metrics = cross_val(
                            classifier=model,
                            data=data_copy,
                            unpriv_group=unpriv_group,
                            priv_group=priv_group,
                            label=label,
                            metrics=metrics,
                            positive_label=positive_label,
                            sensitive_features=sensitive_features,
                            postprocessor=method,
                            n_splits=params.get("K", 10),
                            params=params,
                        )
                        df_metrics = _store_metrics(
                            ris_metrics,
                            m,
                            method.name,
                            save_data,
                            save_model,
                            model_fair,
                        )
                        ris = ris.append(df_metrics)
                else:
                    metrics = deepcopy(base_metrics)
                    model_fair, ris_metrics = cross_val(
                        classifier=model,
                        data=data_copy,
                        unpriv_group=unpriv_group,
                        priv_group=priv_group,
                        label=label,
                        metrics=metrics,
                        positive_label=positive_label,
                        sensitive_features=sensitive_features,
                        n_splits=params.get("K", 10),
                        params=params,
                    )
                    df_metrics = _store_metrics(
                        ris_metrics,
                        m,
                        FairnessMethods.NO_ONE.name,
                        save_data,
                        save_model,
                        model_fair,
                    )
                    ris = ris.append(df_metrics)
                step += 1
                task.update_state(state="PROGRESS", meta={"current": step, "progress": step/total_runs * 100})
        else:
            model = deepcopy(model)
            data_copy = data.copy()
            metrics = deepcopy(base_metrics)
            model_fair, ris_metrics = cross_val(
                classifier=model,
                data=data_copy,
                unpriv_group=unpriv_group,
                priv_group=priv_group,
                label=label,
                metrics=metrics,
                positive_label=positive_label,
                sensitive_features=sensitive_features,
                n_splits=params.get("K", 10),
                params=params,
            )
            df_metrics = _store_metrics(
                ris_metrics, m, "None", save_data, save_model, model_fair
            )
            ris = ris.append(df_metrics)
            step += 1
            task.update_state(state="PROGRESS", meta={"progress": step/total_runs * 100})
    # Generate report
    if agg_metric:
        if params.get("fairness"):
            report = (
                ris.groupby(["fairness_method", "model"])
                .agg(np.mean)
                .sort_values(agg_metric, ascending=False)
                .reset_index()
            )
        else:
            report = (
                ris.groupby(["model"])
                .agg(np.mean)
                .sort_values(agg_metric, ascending=False)
                .reset_index()
            )

        best_ris = report.iloc[0, :]
        model = ml_methods[best_ris["model"]]
        final_model = train_final_model(
            params,
            data,
            label,
            sensitive_features,
            positive_label,
            best_ris,
            model,
        )
        return final_model, report, None
    elif pareto:
        agg_ris = ris.groupby(["fairness_method", "model"]).agg(np.mean)
        pareto_indexes = identify_pareto_front(agg_ris)
        report = agg_ris.iloc[pareto_indexes].reset_index()
        model_list = []
        for row in report.iterrows():
            model = ml_methods[row[1]["model"]]
            final_model = train_final_model(
                params,
                data,
                label,
                sensitive_features,
                positive_label,
                row[1],
                model,
            )
            model_list.append(final_model)
        return model_list, agg_ris.reset_index(), report
    else:
        if params.get("fairness"):
            report = (
                ris.groupby(["fairness_method", "model"]).agg(np.mean).reset_index()
            )
        else:
            report = ris.groupby(["model"]).agg(np.mean).reset_index()
        return None, report, None
