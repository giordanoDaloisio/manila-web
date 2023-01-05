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
    // At least one presentation must be selected
    const pres_error = !(
      state.tabular ||
      state.bar_plot ||
      state.line_plot ||
      state.strip_plot ||
      state.box_plot ||
      state.point_plot
    );
    setErrors({
      error_model,
      error_sensvars: sens_error,
      errors_fairmethods: fair_method_error,
      class_metrics: metric_error,
      aggr_metrics: aggr_error,
      pres_error,
    });
  }, [state]);
  return errors;
};
