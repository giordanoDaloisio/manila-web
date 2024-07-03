import numpy as np
import pandas as pd
from sklearn.model_selection import KFold
from sklearn.model_selection import LeaveOneOut
from sklearn.model_selection import LeavePOut
from sklearn.model_selection import StratifiedKFold
from sklearn.model_selection import GroupKFold
from sklearn.model_selection import StratifiedGroupKFold
from fairlearn.reductions import (
    BoundedGroupLoss,
    GridSearch,
    ExponentiatedGradient,
    DemographicParity,
    ZeroOneLoss,
)
from aif360.datasets import BinaryLabelDataset
from aif360.algorithms.preprocessing import Reweighing
from aif360.algorithms.preprocessing import DisparateImpactRemover
from aif360.algorithms.preprocessing import LFR
from copy import deepcopy
from scipy import stats
from demv import DEMV
from aif360.algorithms.inprocessing import GerryFairClassifier
from aif360.algorithms.inprocessing import MetaFairClassifier
from aif360.algorithms.inprocessing import PrejudiceRemover
from aif360.sklearn.postprocessing import PostProcessingMeta
from aif360.sklearn.postprocessing import CalibratedEqualizedOdds
from aif360.sklearn.postprocessing import RejectOptionClassifierCV
from sklearn.neural_network import MLPClassifier
import statistics
from service.experiment.metrics import *
from icecream import ic

# import tensorflow as tf

from service.experiment.methods import FairnessMethods

np.random.seed(2)

# TRAINING FUNCTIONS


def cross_val(
    classifier,
    data,
    label,
    unpriv_group,
    priv_group,
    sensitive_features,
    positive_label,
    metrics,
    n_splits=10,
    preprocessor=None,
    inprocessor=None,
    postprocessor=None,
    params=None,
):
    if params is None:
        params = {}

    use_validation = params.get("use_validation", False)
    validation = params.get("validation", "")
    reweighing = params.get("reweighing", False)
    dir = params.get("dir", False)
    demv = params.get("demv", False)
    exponentiated_gradient = params.get("exponentiated_gradient", False)
    grid_search = params.get("grid_search", False)
    adversarial_debiasing = params.get("adversarial_debiasing", False)
    gerry_fair_classifier = params.get("gerry_fair_classifier", False)
    meta_fair_classifier = params.get("meta_fair_classifier", False)
    prejudice_remover = params.get("prejudice_remover", False)
    calibrated_eo = params.get("calibrated_eo", False)
    reject_option_classifier = params.get("reject_option_classifier", False)
    standard_scaler = params.get("standard_scaler", False)
    min_max_scaler = params.get("min_max_scaler", False)
    max_abs_scaler = params.get("max_abs_scaler", False)
    robust_scaler = params.get("robust_scaler", False)
    quantile_transformer_scaler = params.get("quantile_transformer_scaler", False)
    power_transformer_scaler = params.get("power_transformer_scaler", False)

    if not use_validation:
        n_splits = 2

    data_start = data.copy()

    if validation == "k_fold" or not use_validation:
        fold = KFold(n_splits=n_splits, shuffle=True, random_state=2)
    elif use_validation:
        if validation == "leave_one_out":
            fold = LeaveOneOut()
        elif validation == "leave_p_out":
            fold = LeavePOut(p=n_splits)
        elif validation == "stratified_k_fold":
            fold = StratifiedKFold(n_splits=n_splits)
        elif validation == "group_k_fold":
            fold = GroupKFold(n_splits=n_splits)
        elif validation == "stratified_group_k_fold":
            fold = StratifiedGroupKFold(n_splits=n_splits)

    for train, test in fold.split(data_start):
        weights = None
        data = data_start.copy()
        df_train = data.iloc[train]
        df_test = data.iloc[test]
        model = deepcopy(classifier)

        if preprocessor == FairnessMethods.RW:
            bin_data = BinaryLabelDataset(
                favorable_label=positive_label,
                unfavorable_label=1 - positive_label,
                df=df_train,
                label_names=[label],
                protected_attribute_names=sensitive_features,
            )
            rw = Reweighing(
                unprivileged_groups=[unpriv_group], privileged_groups=[priv_group]
            )
            rw_data = rw.fit_transform(bin_data)
            weights = rw_data.instance_weights
            df_train, _ = rw_data.convert_to_dataframe()

        if preprocessor == FairnessMethods.DIR:
            bin_data = BinaryLabelDataset(
                favorable_label=positive_label,
                unfavorable_label=1 - positive_label,
                df=df_train,
                label_names=[label],
                protected_attribute_names=sensitive_features,
            )
            dir = DisparateImpactRemover(sensitive_attribute=sensitive_features[0])
            trans_data = dir.fit_transform(bin_data)
            df_train, _ = trans_data.convert_to_dataframe()

        if preprocessor == FairnessMethods.DEMV:
            demv = DEMV(sensitive_vars=sensitive_features)
            df_train, y = demv.fit_transform(
                df_train.drop(columns=label), df_train[label]
            )
            df_train[label] = y

        if inprocessor == FairnessMethods.EG:
            constr = _get_constr(df_train, label)
            if (
                standard_scaler
                or min_max_scaler
                or max_abs_scaler
                or robust_scaler
                or quantile_transformer_scaler
                or power_transformer_scaler
            ):
                model = ExponentiatedGradient(
                    model,
                    constraints=constr,
                    sample_weight_name="classifier__sample_weight",
                )
            else:
                model = ExponentiatedGradient(
                    model, constraints=constr, sample_weight_name="sample_weight"
                )

        if inprocessor == FairnessMethods.GRID:
            constr = _get_constr(df_train, label)
            if (
                standard_scaler
                or min_max_scaler
                or max_abs_scaler
                or robust_scaler
                or quantile_transformer_scaler
                or power_transformer_scaler
            ):
                model = GridSearch(
                    model,
                    constraints=constr,
                    sample_weight_name="classifier__sample_weight",
                )
            else:
                model = GridSearch(
                    model, constraints=constr, sample_weight_name="sample_weight"
                )

        # if adversarial_debiasing:
        #     if inprocessor == 'FairnessMethods.AD':
        #         tf.reset_default_graph()
        #         sess = tf.Session()
        #         model = AdversarialDebiasing(privileged_groups=[priv_group], unprivileged_groups=[unpriv_group], scope_name='debiased_classifier', debias=True, sess=sess)
        #         tf.disable_eager_execution()

        if inprocessor == FairnessMethods.GERRY:
            model = GerryFairClassifier(fairness_def="FP")

        if inprocessor == FairnessMethods.META:
            model = MetaFairClassifier(sensitive_attr=sensitive_features[0])

        if inprocessor == FairnessMethods.PREJ:
            model = PrejudiceRemover(
                sensitive_attr=sensitive_features[0], class_attr=label
            )

        if any(
            [
                gerry_fair_classifier,
                meta_fair_classifier,
                prejudice_remover,
                adversarial_debiasing,
            ]
        ):
            pred, model = _train_gerry_meta(
                df_train, df_test, label, model, sensitive_features, positive_label
            )
        else:
            exp = inprocessor in [FairnessMethods.EG, FairnessMethods.GRID]
            pred, model = _model_train(
                df_train,
                df_test,
                label,
                model,
                sensitive_features,
                exp=exp,
                weights=weights,
                params=params,
            )

        # if adversarial_debiasing:
        #     if inprocessor == 'FairnessMethods.AD':
        #         sess.close()

        if postprocessor:
            df_train = df_train.set_index(sensitive_features[0])
            df_test = df_test.set_index(sensitive_features[0])

        if postprocessor == FairnessMethods.CAL_EO:
            cal = CalibratedEqualizedOdds(prot_attr=sensitive_features[0])
            model, pred = _compute_postprocessing(model, cal, df_train, df_test, label)

        if postprocessor == FairnessMethods.REJ:
            rej = RejectOptionClassifierCV(
                scoring="statistical_parity", prot_attr=sensitive_features[0]
            )
            model, pred = _compute_postprocessing(model, rej, df_train, df_test, label)

        compute_metrics(
            pred,
            unpriv_group,
            label,
            positive_label,
            metrics,
            sensitive_features,
            params=params,
        )

    return model, metrics


def _get_constr(df, label):
    if len(df[label].unique()) == 2:
        constr = DemographicParity()
    else:
        constr = BoundedGroupLoss(ZeroOneLoss(), upper_bound=0.1)
    return constr


def _train_test_split(df_train, df_test, label):
    x_train = df_train.drop(label, axis=1).values
    y_train = df_train[label].values.ravel()
    x_test = df_test.drop(label, axis=1).values
    y_test = df_test[label].values.ravel()
    return x_train, x_test, y_train, y_test


def _model_train(
    df_train,
    df_test,
    label,
    classifier,
    sensitive_features,
    exp=False,
    weights=None,
    adv=False,
    params=None,
):
    if params is None:
        params = {}

    mlp_classifier = params.get("mlp__classifier", False)
    standard_scaler = params.get("standard_scaler", False)
    min_max_scaler = params.get("min_max_scaler", False)
    max_abs_scaler = params.get("max_abs_scaler", False)
    robust_scaler = params.get("robust_scaler", False)
    quantile_transformer_scaler = params.get("quantile_transformer_scaler", False)
    power_transformer_scaler = params.get("power_transformer_scaler", False)

    x_train, x_test, y_train, y_test = _train_test_split(df_train, df_test, label)
    model = deepcopy(classifier)
    if adv:
        model.fit(x_train, y_train)
    else:
        if exp:
            model.fit(x_train, y_train, sensitive_features=df_train[sensitive_features])
        else:
            if isinstance(
                (
                    model["classifier"]
                    if (
                        standard_scaler
                        or min_max_scaler
                        or max_abs_scaler
                        or robust_scaler
                        or quantile_transformer_scaler
                        or power_transformer_scaler
                    )
                    else model
                ),
                MLPClassifier,
            ):
                model.fit(x_train, y_train)
            else:
                if (
                    standard_scaler
                    or min_max_scaler
                    or max_abs_scaler
                    or robust_scaler
                    or quantile_transformer_scaler
                    or power_transformer_scaler
                ):
                    model.fit(x_train, y_train, classifier__sample_weight=weights)
                else:
                    model.fit(x_train, y_train, sample_weight=weights)

    df_pred = _predict_data(model, df_test, label, x_test)

    # if adv:
    #     model.sess_.close()

    return df_pred, model


def _train_gerry_meta(
    df_train, df_test, label, model, sensitive_features, positive_label
):
    bin_train = BinaryLabelDataset(
        favorable_label=positive_label,
        unfavorable_label=1 - positive_label,
        df=df_train,
        label_names=[label],
        protected_attribute_names=sensitive_features,
    )
    model.fit(bin_train)
    bin_test = BinaryLabelDataset(
        favorable_label=positive_label,
        unfavorable_label=1 - positive_label,
        df=df_test,
        label_names=[label],
        protected_attribute_names=sensitive_features,
    )
    df_pred = _predict_data(model, df_test, label, bin_test, True)
    return df_pred, model


def _compute_postprocessing(model, postprocessor, d_train, d_test, label):
    meta = PostProcessingMeta(model, postprocessor)
    meta.fit(d_train.drop(label, axis=1), d_train[label])
    df_pred = _predict_data(meta, d_test, label, d_test.drop(label, axis=1))
    return meta, df_pred


def _predict_data(model, df_test, label, x_test, aif_data=False):
    pred = model.predict(x_test)
    df_pred = df_test.copy()
    df_pred["y_true"] = df_pred[label]
    if aif_data:
        df_pred[label] = pred.labels
    else:
        df_pred[label] = pred
    return df_pred


##### METRICS FUNCTIONS #####


def get_weights(params: dict):
    weights = {}
    for key in params.keys():
        if "weight" in key and not "weighted" in key:
            new_key = "_".join(key.split("_")[1:])
            weights[new_key] = float(params[key])
    return weights


def compute_weighted_mean(metrics: dict, weights: dict):
    weighted_mean = 0
    for key in metrics.keys():
        if key in weights.keys():
            weighted_mean += metrics[key] * weights[key]
    return weighted_mean / sum(weights.values())


def compute_metrics(
    df_pred,
    unpriv_group,
    label,
    positive_label,
    metrics,
    sensitive_features,
    params=None,
):
    if params is None:
        params = {}

    df_pred = df_pred.reset_index()

    statistical_parity_enabled = params.get("statistical_parity", False)
    equalized_odds_enabled = params.get("equalized_odds", False)
    disparate_impact_enabled = params.get("disparate_impact", False)
    average_odds_enabled = params.get("average_odds", False)
    true_positive_difference_enabled = params.get("true_positive_difference", False)
    false_positive_difference_enabled = params.get("false_positive_difference", False)
    zero_one_loss_enabled = params.get("zero_one_loss", False)
    accuracy_enabled = params.get("accuracy", False)
    precision_enabled = params.get("precision", False)
    recall_enabled = params.get("recall", False)
    f1_score_enabled = params.get("f1_score", False)
    auc_enabled = params.get("auc", False)
    euclidean_distance_enabled = params.get("euclidean_distance", False)
    manhattan_distance_enabled = params.get("manhattan_distance", False)
    mahalanobis_distance_enabled = params.get("mahalanobis_distance", False)
    harmonic_mean_enabled = params.get("harmonic_mean", False)
    weighted_mean_enabled = params.get("weighted_mean", False)
    min_enabled = params.get("min", False)
    max_enabled = params.get("max", False)
    mean_enabled = params.get("statistical_mean", False)
    if statistical_parity_enabled:
        stat_par = statistical_parity(df_pred, unpriv_group, label, positive_label)
        metrics["stat_par"].append(stat_par)

    if equalized_odds_enabled:
        eo = equalized_odds(df_pred, unpriv_group, label, positive_label)
        metrics["eq_odds"].append(eo)

    if disparate_impact_enabled:
        di = disparate_impact(
            df_pred, unpriv_group, label, positive_label=positive_label
        )
        metrics["disp_imp"].append(di)

    if average_odds_enabled:
        ao = average_odds_difference(df_pred, unpriv_group, label, positive_label)
        metrics["ao"] = ao

    if true_positive_difference_enabled:
        tpr = true_pos_diff(df_pred, unpriv_group, label, positive_label)
        metrics["tpr_diff"] = tpr

    if false_positive_difference_enabled:
        fpr = false_pos_diff(df_pred, unpriv_group, label, positive_label)
        metrics["fpr_diff"] = fpr

    if zero_one_loss_enabled:
        zero_one_loss = zero_one_loss_diff(
            y_true=df_pred["y_true"].values,
            y_pred=df_pred[label].values,
            sensitive_features=df_pred[sensitive_features].values,
        )
        metrics["zero_one_loss"].append(zero_one_loss)

    if accuracy_enabled:
        accuracy_score = accuracy(df_pred, label)
        metrics["acc"].append(accuracy_score)

    if precision_enabled:
        precision_score = precision(df_pred, label)
        metrics["precision"].append(precision_score)

    if recall_enabled:
        recall_score = recall(df_pred, label)
        metrics["recall"].append(recall_score)

    if f1_score_enabled:
        f1_score_val = f1(df_pred, label)
        metrics["f1score"].append(f1_score_val)

    if auc_enabled:
        auc_score = auc(df_pred, label)
        metrics["auc"].append(auc_score)

    if euclidean_distance_enabled:
        euc_dist = euclidean_distance(df_pred, label)
        metrics["euclidean_distance"].append(euc_dist)

    if manhattan_distance_enabled:
        man_dist = manhattan_distance(df_pred, label)
        metrics["manhattan_distance"].append(man_dist)

    if mahalanobis_distance_enabled:
        mahal_dist = mahalanobis_distance(df_pred, label)
        metrics["mahalanobis_distance"].append(mahal_dist)

    if harmonic_mean_enabled:
        hm_metrics = [
            accuracy_score if accuracy_enabled else None,
            di if disparate_impact_enabled else None,
            norm_data(eo) if equalized_odds_enabled else None,
            norm_data(stat_par) if statistical_parity_enabled else None,
            norm_data(zero_one_loss) if zero_one_loss_enabled else None,
            norm_data(ao) if average_odds_enabled else None,
            precision_score if precision_enabled else None,
            recall_score if recall_enabled else None,
            f1_score_val if f1_score_enabled else None,
            auc_score if auc_enabled else None,
            norm_data(tpr) if true_positive_difference_enabled else None,
            norm_data(fpr) if false_positive_difference_enabled else None,
            norm_data(euc_dist) if euclidean_distance_enabled else None,
            norm_data(man_dist) if manhattan_distance_enabled else None,
            norm_data(mahal_dist) if mahalanobis_distance_enabled else None,
        ]
        # remove None values
        hm_metrics = [i for i in hm_metrics if i is not None]
        metrics["hmean"].append(stats.hmean(hm_metrics))

    if min_enabled:
        hm_metrics = [
            accuracy_score if accuracy_enabled else None,
            di if disparate_impact_enabled else None,
            norm_data(eo) if equalized_odds_enabled else None,
            norm_data(stat_par) if statistical_parity_enabled else None,
            norm_data(zero_one_loss) if zero_one_loss_enabled else None,
            norm_data(ao) if average_odds_enabled else None,
            precision_score if precision_enabled else None,
            recall_score if recall_enabled else None,
            f1_score_val if f1_score_enabled else None,
            auc_score if auc_enabled else None,
            norm_data(tpr) if true_positive_difference_enabled else None,
            norm_data(fpr) if false_positive_difference_enabled else None,
            norm_data(euc_dist) if euclidean_distance_enabled else None,
            norm_data(man_dist) if manhattan_distance_enabled else None,
            norm_data(mahal_dist) if mahalanobis_distance_enabled else None,
        ]
        hm_metrics = [i for i in hm_metrics if i is not None]
        metrics["min"].append(min(hm_metrics))

    if max_enabled:
        hm_metrics = [
            accuracy_score if accuracy_enabled else None,
            di if disparate_impact_enabled else None,
            norm_data(eo) if equalized_odds_enabled else None,
            norm_data(stat_par) if statistical_parity_enabled else None,
            norm_data(zero_one_loss) if zero_one_loss_enabled else None,
            norm_data(ao) if average_odds_enabled else None,
            precision_score if precision_enabled else None,
            recall_score if recall_enabled else None,
            f1_score_val if f1_score_enabled else None,
            auc_score if auc_enabled else None,
            norm_data(tpr) if true_positive_difference_enabled else None,
            norm_data(fpr) if false_positive_difference_enabled else None,
            norm_data(euc_dist) if euclidean_distance_enabled else None,
            norm_data(man_dist) if manhattan_distance_enabled else None,
            norm_data(mahal_dist) if mahalanobis_distance_enabled else None,
        ]
        hm_metrics = [i for i in hm_metrics if i is not None]
        metrics["max"].append(max(hm_metrics))

    if mean_enabled:
        hm_metrics = [
            accuracy_score if accuracy_enabled else None,
            di if disparate_impact_enabled else None,
            norm_data(eo) if equalized_odds_enabled else None,
            norm_data(stat_par) if statistical_parity_enabled else None,
            norm_data(zero_one_loss) if zero_one_loss_enabled else None,
            norm_data(ao) if average_odds_enabled else None,
            precision_score if precision_enabled else None,
            recall_score if recall_enabled else None,
            f1_score_val if f1_score_enabled else None,
            auc_score if auc_enabled else None,
            norm_data(tpr) if true_positive_difference_enabled else None,
            norm_data(fpr) if false_positive_difference_enabled else None,
            norm_data(euc_dist) if euclidean_distance_enabled else None,
            norm_data(man_dist) if manhattan_distance_enabled else None,
            norm_data(mahal_dist) if mahalanobis_distance_enabled else None,
        ]
        hm_metrics = [i for i in hm_metrics if i is not None]
        metrics["mean"].append(statistics.mean(hm_metrics))

    if weighted_mean_enabled:
        weights = get_weights(params)
        wm_metrics = {
            "acc": accuracy_score if accuracy_enabled else None,
            "disp_imp": di if disparate_impact_enabled else None,
            "eq_odds": norm_data(eo) if equalized_odds_enabled else None,
            "stat_par": norm_data(stat_par) if statistical_parity_enabled else None,
            "zero_one_loss": (
                norm_data(zero_one_loss) if zero_one_loss_enabled else None
            ),
            "ao": norm_data(ao) if average_odds_enabled else None,
            "precision": precision_score if precision_enabled else None,
            "recall": recall_score if recall_enabled else None,
            "f1score": f1_score_val if f1_score_enabled else None,
            "auc": auc_score if auc_enabled else None,
            "tpr_diff": norm_data(tpr) if true_positive_difference_enabled else None,
            "fpr_diff": norm_data(fpr) if false_positive_difference_enabled else None,
            "euclidean_distance": (
                norm_data(euc_dist) if euclidean_distance_enabled else None
            ),
            "manhattan_distance": (
                norm_data(man_dist) if manhattan_distance_enabled else None
            ),
            "mahalanobis_distance": (
                norm_data(mahal_dist) if mahalanobis_distance_enabled else None
            ),
        }
        metrics["weighted_mean"].append(compute_weighted_mean(wm_metrics, weights))

    return metrics
