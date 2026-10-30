import { createContext, useContext, useState } from "react";

const defaultState = {
  name: "",
  dataset: {
    source: "builtin",
    dataset_id: null,
    name: "",
    label_column: "",
    positive_label: "",
    target_values: [],
    sensitive_attrs: [],
    columns: [],
    preview: [],
  },
  scaler: "StandardScaler",
  task_type: "classification",
  models: [],
  fairness_enabled: true,
  fairness_methods: ["No Method"],
  bias_scope: null,               // 'individual' | 'group'
  group_treatment: null,          // 'equally' | 'proportionally' | 'other'
  fairness_metrics: [],           // [{name, weight}]
  effectiveness_metrics: [],      // [{name, weight}]
  tradeoff: { strategy: "aggregation", aggregation: "mean", primary_metric: null },
  graph_options: ["tradeoff_score", "metric_scatter"],
  graph_axes: { metric_scatter: { x: null, y: null }, pareto_plot: { x: null, y: null } },
  validation: { method: "train_test", split: 80, k: 5, random_seed: 42 },
};

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [state, setState] = useState(defaultState);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const updateDataset = (patch) => setState((s) => ({ ...s, dataset: { ...s.dataset, ...patch } }));
  const updateTradeoff = (patch) => setState((s) => ({ ...s, tradeoff: { ...s.tradeoff, ...patch } }));
  const updateValidation = (patch) => setState((s) => ({ ...s, validation: { ...s.validation, ...patch } }));
  const reset = () => setState(defaultState);

  return (
    <WizardContext.Provider value={{ state, update, updateDataset, updateTradeoff, updateValidation, reset }}>
      {children}
    </WizardContext.Provider>
  );
}

export const useWizard = () => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be inside WizardProvider");
  return ctx;
};
