"""Evaluation helpers kept independent from model training and API formatting."""

import numpy as np
import pandas as pd


def binary_fairness_metrics(y_true, y_pred, positive_value, sensitive_frame: pd.DataFrame) -> tuple[dict, int]:
    actual = np.asarray(y_true == positive_value, dtype=bool)
    predicted = np.asarray(y_pred == positive_value, dtype=bool)
    group_frame = sensitive_frame.fillna("<missing>").astype(str)
    group_labels = group_frame.apply(lambda row: tuple(row.values), axis=1).tolist()
    selection_rates = []
    true_positive_rates = []
    false_positive_rates = []
    for group in dict.fromkeys(group_labels):
        mask = np.fromiter((label == group for label in group_labels), dtype=bool, count=len(group_labels))
        group_actual = actual[mask]
        group_predicted = predicted[mask]
        selection_rates.append(float(group_predicted.mean()))
        positives = group_actual.sum()
        negatives = (~group_actual).sum()
        if positives:
            true_positive_rates.append(float(group_predicted[group_actual].mean()))
        if negatives:
            false_positive_rates.append(float(group_predicted[~group_actual].mean()))

    def difference(values):
        return float(max(values) - min(values)) if len(values) > 1 else 0.0

    return {
        "demographic_parity_difference": difference(selection_rates),
        "equalized_odds_difference": max(difference(true_positive_rates), difference(false_positive_rates)),
    }, len(selection_rates)
