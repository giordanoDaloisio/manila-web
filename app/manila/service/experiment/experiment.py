import os
import pickle
from copy import deepcopy
import utils
import model_trainer
from datetime import datetime
from methods import FairnessMethods

from charts import Charts

from demv import DEMV
from fairlearn.reductions import ExponentiatedGradient, BoundedGroupLoss, ZeroOneLoss, GridSearch, DemographicParity
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
# {%if web%}
# import importlib

# utils = importlib.reload(utils)
# model_trainer = importlib.reload(model_trainer)
# {%endif%}

from utils import *
from model_trainer import ModelTrainer

def get_base_metrics(params: dict):
    base_metrics = {}
    if "precision" in params:
        base_metrics['precision'] = []
    if "recall" in params:
        base_metrics['recall'] = []
    if "f1_score" in params:
        base_metrics['f1_score'] = []
    if "auc" in params:
        base_metrics['auc'] = []
    if "statistical_parity" in params:
        base_metrics['stat_par'] = []
    if "equalized_odds" in params:
        base_metrics['eq_odds'] = []
    if "zero_one_loss" in params:
        base_metrics['zero_one_loss'] = []
    if "disparate_impact" in params:
        base_metrics['disp_imp'] = []
    if "average_odds" in params:
        base_metrics['ao'] = []
    if "true_positive_difference" in params:
        base_metrics['tpr_diff'] = []
    if "false_positive_difference" in params:
        base_metrics['fpr_diff'] = []
    if "accuracy" in params:
        base_metrics['acc'] = []
    if "euclidean_distance" in params:
        base_metrics['euclidean_distance'] = []
    if "manhattan_distance" in params:
        base_metrics['manhattan_distance'] = []
    if "mahalanobis_distance" in params:
        base_metrics['mahalanobis_distance'] = []
    if "harmonic_mean" in params:
        base_metrics['hmean'] = []
    if "max" in params:
        base_metrics['max'] = []
    if "min" in params:
        base_metrics['min'] = []
    if "statistical_mean" in params:
        base_metrics['mean'] = []
    return base_metrics


def _store_metrics(metrics, method, fairness, save_data, save_model, model_fair):
    df_metrics = pd.DataFrame(metrics)
    df_metrics = df_metrics.explode(list(df_metrics.columns))
    df_metrics['model'] = method
    df_metrics['fairness_method'] = fairness
    if save_data:
        os.makedirs('ris', exist_ok=True)
        df_metrics.to_csv(os.path.join(
            'ris', f'ris_{method}_{fairness}.csv'))
    if save_model:
        os.makedirs('ris', exist_ok=True)
        pickle.dump(model_fair, open(os.path.join(
            'ris', f'{method}_{fairness}_partial.pickle'), 'wb'))
    return df_metrics



def run_exp(data):
    label = '{{name}}'
    positive_label = {{positive_value}}
    
    {% if single_sensitive_var%}
    unpriv_group = { '{{variable_name}}': {{unprivileged_value}} }
    priv_group = { '{{variable_name}}': {{privileged_value}} }
    sensitive_features = ['{{variable_name}}']
    {% elif multiple_sensitive_vars %}
    {% set variables = variable_names.split(',') %}
    {% set privileged_values = privileged_values.split(',') %}
    {% set unprivileged_values = unprivileged_values.split(',') %}
    priv_group = {
    {% for i in range(0, variables|count)%}
    '{{variables[i]}}': {{privileged_values[i]}},
    {% endfor %}
    }
    unpriv_group = {
    {% for i in range(0, variables|count)%}
    '{{variables[i]}}': {{unprivileged_values[i]}},
    {% endfor %}
    }
    sensitive_features = [{{variables|map("tojson")|join(", ")}}]
    {%else%}
    unpriv_group = []
    priv_group = []
    sensitive_features = []
    {% endif %}

    save_data = {% if save_temporary_results == 'true' %} True {%else%} False {%endif%}

    save_model = {% if save_trained_model == 'true' %} True {%else%} False {%endif%}
    
    ml_methods = {
        {% if logistic__regression %}
        'logreg': LogisticRegression(),
        {%endif%}
        {% if svc %}
        'svm': SVC(),
        {% endif %}
        {% if gradient__boosting__classifier %}
        'gradient_class': GradientBoostingClassifier(),
        {%endif%}
        {%if mlp__classifier%}
        'mlp': MLPClassifier(),
        {%endif%}
        {% if gradient__descent__classifier %}
        'sdgclass': SGDClassifier(),
        {% endif %}
        {% if decision__tree__classifier %}
        'tree': DecisionTreeClassifier(),
        {% endif %}
        {% if random__forest__classifier%}
        'forest': RandomForestClassifier(),
        {% endif %}
        {% if linear__regression%}
        'linreg': LinearRegression(),
        {%endif%}
        {% if svr%}
        'svr': SVR(),
        {%endif%}
        {%if gradient__descent__regressor%}
        'sdgreg': SGDRegressor(),
        {%endif%}
        {% if gradient__boosting__regressor %}
        'gradient_reg': GradientBoostingRegressor(),
        {% endif %}
        {%if mlp__regressor%}
        'mlp_reg': MLPRegressor(),
        {%endif%}
        {%if decision__tree__regressor %}
        'tree_reg': DecisionTreeRegressor(),
        {%endif%}
    }

    fairness_methods = {
        {%if no__method%}
        'no_method': FairnessMethods.NO_ONE,
        {%endif%}
        'preprocessing': [
            {%if demv%}
            FairnessMethods.DEMV,
            {%endif%}
            {%if reweighing%}
            FairnessMethods.RW,
            {%endif%}
            {%if dir%}
            FairnessMethods.DIR,
            {%endif%}
        ],
        'inprocessing': [
            {% if exponentiated_gradient %}
            FairnessMethods.EG,
            {% endif %}
            {% if grid_search %}
            FairnessMethods.GRID,
            {% endif %}
            {% if adversarial_debiasing %}
            FairnessMethods.AD,
            {% endif%}   
            {% if gerry_fair_classifier %}
            FairnessMethods.GERRY,
            {%endif%}
            {% if meta_fair_classifier%}
            FairnessMethods.META,
            {%endif%}
            {% if prejudice_remover%}
            FairnessMethods.PREJ,
            {%endif%}
        ],
        'postprocessing': [
            {% if calibrated_eo%}
            FairnessMethods.CAL_EO,
            {%endif%}
            {%if reject_option_classifier%}
            FairnessMethods.REJ,
            {%endif%}
        ]
    }

    agg_metric = '{{agg_metric}}'
    dataset_label = {% if multi_class %} 'multi-class' {%else%} 'binary' {%endif%}

    ris = pd.DataFrame()
    for m in ml_methods.keys():
        {%if (standard_scaler or min_max_scaler or max_abs_scaler or robust_scaler or quantile_transformer_scaler or power_transformer_scaler)%}
        model = Pipeline([
            {{""}}{%include 'components/model_scalers.py.jinja'%}
            ('classifier', ml_methods[m])
        ])
        {%else%}
        model = ml_methods[m]
        {%endif%}

        {% if fairness%}
        for f in fairness_methods.keys():
            model = deepcopy(model)
            data = data.copy()
            if f == 'preprocessing':
                for method in fairness_methods[f]:
                    metrics = deepcopy(base_metrics)
                    model_fair, ris_metrics = cross_val(classifier=model, data=data, unpriv_group=unpriv_group, priv_group=priv_group, label=label, metrics=metrics, positive_label=positive_label, sensitive_features=sensitive_features, preprocessor=method, n_splits={{K | default(10, true)}})
                    df_metrics = _store_metrics(ris_metrics, m, method.name, save_data, save_model, model_fair)
                    ris = ris.append(df_metrics)
            elif f == 'inprocessing':
                for method in fairness_methods[f]:
                    metrics = deepcopy(base_metrics)
                    model_fair, ris_metrics = cross_val(classifier=model, data=data, unpriv_group=unpriv_group, priv_group=priv_group, label=label, metrics=metrics, positive_label=positive_label, sensitive_features=sensitive_features, inprocessor=method, n_splits={{K | default(10,true)}})
                    df_metrics = _store_metrics(
                        ris_metrics, m, method.name, save_data, save_model, model_fair)
                    ris = ris.append(df_metrics)
            elif f == 'postprocessing':
                for method in fairness_methods[f]:
                    metrics = deepcopy(base_metrics)
                    model_fair, ris_metrics = cross_val(classifier=model, data=data, unpriv_group=unpriv_group, priv_group=priv_group, label=label, metrics=metrics, positive_label=positive_label,sensitive_features=sensitive_features, postprocessor=method, n_splits={{K | default(10,true)}})
                    df_metrics = _store_metrics(ris_metrics, m, method.name, save_data, save_model, model_fair)
                    ris = ris.append(df_metrics)
            else:
                metrics = deepcopy(base_metrics)
                model_fair, ris_metrics = cross_val(classifier=model, data=data, unpriv_group=unpriv_group, priv_group=priv_group, label=label, metrics=metrics, positive_label=positive_label,sensitive_features=sensitive_features, n_splits={{K | default(10,true)}})
                df_metrics = _store_metrics(ris_metrics, m, FairnessMethods.NO_ONE.name, save_data, save_model, model_fair)
                ris = ris.append(df_metrics)
        {% else%}
        model = deepcopy(model)
        data = data.copy()
        metrics = deepcopy(base_metrics)
        model_fair, ris_metrics = cross_val(
            classifier=model, data=data, unpriv_group=unpriv_group, priv_group=priv_group, 
            label=label, metrics=metrics, 
            positive_label=positive_label, 
            sensitive_features=sensitive_features, 
            n_splits={{K | default(10, true)}})
        df_metrics = _store_metrics(ris_metrics, m, 'None', save_data, save_model, model_fair)
        ris = ris.append(df_metrics)
        {%endif%}

    {%if fairness%}
    report = ris.groupby(['fairness_method', 'model']).agg(
        np.mean).sort_values(agg_metric, ascending=False).reset_index()
    {%else%}
    report = ris.groupby(['model']).agg(
        np.mean).sort_values(agg_metric, ascending=False).reset_index()
    {%endif%}
    best_ris = report.iloc[0,:]
    model = ml_methods[best_ris['model']]
    {% if scaler %}
    model = Pipeline([
        {{''}}{%include 'components/model_scalers.py.jinja'%}
        ('classifier', model)
    ])
    {% endif %}
    {%if fairness%}
    trainer = ModelTrainer(data, label, sensitive_features, positive_label)
    if best_ris['fairness_method'] == FairnessMethods.NO_ONE.name:
        model.fit(data.drop(label, axis=1), data[label])
        return model, report
    {%if demv%}
    if best_ris['fairness_method'] == FairnessMethods.DEMV.name:
        demv = trainer.use_demv(model)
        return demv, report
    {%endif%}
    if best_ris['fairness_method'] == FairnessMethods.RW.name:
        rw = trainer.use_rw(model)
        return rw, report
    elif best_ris['fairness_method'] == FairnessMethods.DIR.name:
        dir = trainer.use_dir(model)
        return dir, report
    elif best_ris['fairness_method'] == FairnessMethods.EG.name:
        eg = trainer.use_eg(model)
        return eg, report
    elif best_ris['fairness_method'] == FairnessMethods.GRID.name:
        grid = trainer.use_grid(model)
        return grid, report
    elif best_ris['fairness_method'] == FairnessMethods.GERRY.name:
        gerry = trainer.use_gerry()
        return gerry, report
    elif best_ris['fairness_method'] == FairnessMethods.META.name:
        meta = trainer.use_meta()
        return meta, report
    elif best_ris['fairness_method'] == FairnessMethods.PREJ.name:
        prej = trainer.use_prj()
        return prej, report
    elif best_ris['fairness_method'] == FairnessMethods.CAL_EO.name:
        cal = trainer.use_cal_eo(model)
        return cal, report 
    else:
        rej = trainer.use_rej_opt(model)
        return rej, report
    {%else%}
    model.fit(data.drop(label,axis=1).values, data[label].values.ravel())
    return model, report
    {%endif%}