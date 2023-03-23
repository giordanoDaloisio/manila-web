import { useEffect, useState } from "react";

export const useValidation = (state) => {
  const [errors, setErrors] = useState({});
  useEffect(() => {
    // At least one class or reg method must be selected
    const error_model =
      (state.ml__task === "classification" &&
        !(
          state.logistic__regression ||
          state.svc ||
          state.gradient__descent__classifier ||
          state.gradient__boosting__classifier ||
          state.mlp__classifier ||
          state.decision__tree__classifier ||
          state.random__forest__classifier
        )) ||
      (state.ml__task === "regression" &&
        !(
          state.linear__regression ||
          state.svr ||
          state.gradient__descent__regressor ||
          state.gradient__boosting__regressor ||
          state.mlp__regressor ||
          state.decision__tree__regressor
        ));
    // Sensitive features must be selected for fairness methods
    const sens_error =
      state.fairness &&
      !state.single_sensitive_var &&
      !state.multiple_sensitive_vars;
    // At least one fairness method must be selected
    const fair_method_error =
      state.fairness &&
      !(
        state.no__method ||
        state.reweighing ||
        state.dir ||
        state.demv ||
        state.exponentiated_gradient ||
        state.grid_search ||
        state.adversarial_debiasing ||
        state.gerry_fair_classifier ||
        state.meta_fair_classifier ||
        state.prejudice_remover ||
        state.calibrated_eo ||
        state.reject_option_classifier
      );
    // At least one class metric must be selected for classification and reg
    const metric_error =
      (state.ml__task === "classification" &&
        !(
          state.accuracy ||
          state.precision ||
          state.recall ||
          state.f1_score ||
          state.auc ||
          state.zero_one_loss
        )) ||
      (state.ml__task === "regression" &&
        !(
          state.mean_squared_error ||
          state.mean_absolute_error ||
          state.r2_error ||
          state.mean_squared_logaritmic_error ||
          state.mean_absolute_percentage_error
        ));
    // At least one aggregation function must be selected
    const aggr_error = !(
      state.min ||
      state.max ||
      state.statistical_mean ||
      state.harmonic_mean
    );
    const fair_metric_err =
      state.fairness &&
      !(
        state.statistical_parity ||
        state.disparate_impact ||
        state.equalized_odds ||
        state.average_odds ||
        state.true_positive_difference ||
        state.false_positive_difference ||
        state.euclidean_distance ||
        state.manhattan_distance ||
        state.mahalanobis_distance
      );
    // At least one presentation must be selected
    // const pres_error = !(
    //   state.tabular ||
    //   state.bar_plot ||
    //   state.line_plot ||
    //   state.strip_plot ||
    //   state.box_plot ||
    //   state.point_plot
    // );
    // eg or grid => !mlp_class and !mlp_regr
    const eg_grid_error =
      (state.exponentiated_gradient || state.grid_search || state.reweighing) &&
      (state.mlp__classifier || state.mlp__regressor);
    // box cox => strictly pos
    const box_cox_err =
      state.box_cox_method && !state.strictly_positive_attributes;
    // methods not compatible with multi sensitive vars
    const multi_vars_err =
      state.multiple_sensitive_vars &&
      (state.dir || state.calibrated_eo || state.reject_option_classifier);
    // methods not compatible with multiclass labels
    const multiclass_err =
      state.label === "multiclass" &&
      (state.reweighing ||
        state.dir ||
        state.adversarial_debiasing ||
        state.gerry_fair_classifier ||
        state.meta_fair_classifier ||
        state.prejudice_remover ||
        state.calibrated_eo ||
        state.reject_option_classifier ||
        state.auc);
    // svc => !cal eo and !rej opt
    const svc_error =
      state.svc && (state.calibrated_eo || state.reject_option_classifier);
    // regression => not fairness
    const regr_error = state.fairness && state.ml__task === "regression";
    // gradient descent => not post processing
    const grad_desc_error =
      state.gradient__descent__classifier &&
      (state.calibrated_eo || state.reject_option_classifier);
    setErrors({
      error_model,
      error_sensvars: sens_error,
      errors_fairmethods: fair_method_error,
      class_metrics: metric_error,
      aggr_metrics: aggr_error,
      // pres_error,
      eg_grid_error,
      box_cox_err,
      multi_vars_err,
      multiclass_err,
      svc_error,
      regr_error,
      grad_desc_error,
      fair_metric_err,
    });
  }, [state]);
  return errors;
};
