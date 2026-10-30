import { useWizard } from "@/context/WizardContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info } from "lucide-react";
import {
  FAIRNESS_METRICS_BY_ANSWER,
  CLASSIFICATION_EFFECTIVENESS,
  REGRESSION_EFFECTIVENESS,
  METRIC_LABELS,
} from "@/lib/fairbench";
import { useState } from "react";

const EFFECTIVENESS_INFO = {
  accuracy: "Fraction of correctly classified samples.",
  balanced_accuracy: "Average recall across target classes.",
  f1_macro: "Macro-averaged harmonic mean of precision and recall.",
  precision_macro: "Macro-averaged positive predictive value.",
  recall_macro: "Macro-averaged sensitivity across target classes.",
  roc_auc: "Area under the ROC curve.",
  mean_absolute_error: "Mean absolute prediction error (lower is better).",
  r2: "Coefficient of determination (higher is better).",
  Accuracy: "Fraction of correctly classified samples.",
  F1: "Harmonic mean of precision and recall.",
  Precision: "Positive predictive value.",
  Recall: "True positive rate (sensitivity).",
  "ROC-AUC": "Area under the ROC curve.",
  MAE: "Mean absolute error (lower is better).",
  MSE: "Mean squared error (lower is better).",
  "R²": "Coefficient of determination (higher is better).",
};

function toggleMetricList(list, name) {
  const idx = list.findIndex((m) => m.name === name);
  if (idx >= 0) return list.filter((_, i) => i !== idx);
  return [...list, { name, weight: 1.0 }];
}

function updateWeight(list, name, w) {
  return list.map((m) => (m.name === name ? { ...m, weight: w } : m));
}

function MetricRow({ name, info, checked, weight, onToggle, onWeight, color = "teal", recommended = false }) {
  const border = color === "teal" ? "border-teal-200 bg-teal-50" : "border-blue-200 bg-blue-50";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${checked ? border : "border-slate-200 bg-white"}`}>
      <Checkbox
        data-testid={`metric-checkbox-${name.replace(/[^a-z0-9]/gi, "-")}`}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-sans text-sm text-slate-900 font-medium">{METRIC_LABELS[name] || name}</div>
          {recommended && <span className="rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800">Recommended to compare</span>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{info}</div>
      </div>
      {checked && (
        <div className="flex items-center gap-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500">weight</Label>
          <Input
            data-testid={`metric-weight-${name.replace(/[^a-z0-9]/gi, "-")}`}
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={weight}
            onChange={(e) => onWeight(Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
            className="h-8 w-16 font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}

export default function Step5Metrics() {
  const { state, update } = useWizard();
  const [effOpen, setEffOpen] = useState(true);

  const setBias = (v) => update({ bias_scope: v, group_treatment: v === "group" ? state.group_treatment : null });

  const effectivenessList = state.task_type === "classification" ? CLASSIFICATION_EFFECTIVENESS : REGRESSION_EFFECTIVENESS;
  const profile = state.dataset.profile || {};
  const imbalanced = (profile.class_imbalance_ratio || 0) >= 3;
  const canComputeFairness = state.task_type === "classification" && profile.n_classes === 2 && state.dataset.sensitive_attrs.length > 0;

  let fairnessOptions = [];
  if (state.fairness_enabled && canComputeFairness) {
    if (state.bias_scope === "individual") fairnessOptions = FAIRNESS_METRICS_BY_ANSWER.individual;
    else if (state.bias_scope === "group" && state.group_treatment) {
      fairnessOptions = FAIRNESS_METRICS_BY_ANSWER[state.group_treatment] || [];
    }
  }

  const toggleFair = (name) => update({ fairness_metrics: toggleMetricList(state.fairness_metrics, name) });
  const setFairWeight = (name, w) => update({ fairness_metrics: updateWeight(state.fairness_metrics, name, w) });
  const toggleEff = (name) => update({ effectiveness_metrics: toggleMetricList(state.effectiveness_metrics, name) });
  const setEffWeight = (name, w) => update({ effectiveness_metrics: updateWeight(state.effectiveness_metrics, name, w) });

  const fairChecked = (name) => state.fairness_metrics.some((m) => m.name === name);
  const fairWeight = (name) => state.fairness_metrics.find((m) => m.name === name)?.weight ?? 1.0;
  const effChecked = (name) => state.effectiveness_metrics.some((m) => m.name === name);
  const effWeight = (name) => state.effectiveness_metrics.find((m) => m.name === name)?.weight ?? 1.0;

  return (
    <div data-testid="step-5-metrics">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 5</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Fairness &amp; effectiveness metrics</h2>
        <p className="text-slate-600">A couple of plain-language questions will surface the relevant fairness metrics. Metric weights range from 0 to 1 and affect the weighted-sum trade-off.</p>
      </div>

      {state.fairness_enabled ? (
        <div className="space-y-6 mb-8">
          {!canComputeFairness && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
              <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              <div>
                {state.task_type !== "classification"
                  ? "Fairness metrics are unavailable for regression in this workflow. Turn fairness analysis off to continue."
                  : profile.n_classes !== 2
                    ? `Fairness metrics currently require exactly two target classes; ${profile.n_classes ?? "the selected target's class count"} was inferred. Turn fairness analysis off or choose a binary target.`
                    : "Choose at least one sensitive/protected feature in Step 1. Without group labels, demographic parity and equalized-odds gaps cannot be computed."}
              </div>
            </div>
          )}
          {imbalanced && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900" role="note">
              The target classes are imbalanced. Balanced accuracy and macro F1 are recommended comparisons because they give each class equal weight; accuracy alone can conceal poor minority-class performance.
            </div>
          )}
          <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="font-sans text-slate-900 font-medium mb-3">
              1. Are you dealing with bias on <span className="text-teal-700">individuals</span> or <span className="text-teal-700">groups</span>?
            </div>
            <RadioGroup value={state.bias_scope || ""} onValueChange={setBias} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Label
                data-testid="bias-scope-individual"
                htmlFor="bias-individual"
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all bg-white ${state.bias_scope === "individual" ? "border-slate-900" : "border-slate-200 hover:border-slate-400"}`}
              >
                <RadioGroupItem id="bias-individual" value="individual" className="mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-sm">Individual</div>
                  <div className="text-xs text-slate-500 mt-1">Similar individuals should be treated similarly.</div>
                </div>
              </Label>
              <Label
                data-testid="bias-scope-group"
                htmlFor="bias-group"
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all bg-white ${state.bias_scope === "group" ? "border-slate-900" : "border-slate-200 hover:border-slate-400"}`}
              >
                <RadioGroupItem id="bias-group" value="group" className="mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-sm">Group</div>
                  <div className="text-xs text-slate-500 mt-1">Individuals of a group should not be discriminated against.</div>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {state.bias_scope === "group" && (
            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-sans text-slate-900 font-medium mb-3">
                2. Should different groups be treated <span className="text-teal-700">equally</span> or <span className="text-teal-700">proportionally</span>?
              </div>
              <RadioGroup value={state.group_treatment || ""} onValueChange={(v) => update({ group_treatment: v })} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: "equally", label: "Equally", hint: "Same probability of a positive label across groups." },
                  { id: "proportionally", label: "Proportionally", hint: "Positive label only when evidence supports it, per group." },
                  { id: "other", label: "Other", hint: "A mixed set of parity metrics." },
                ].map((opt) => (
                  <Label
                    key={opt.id}
                    data-testid={`group-treatment-${opt.id}`}
                    htmlFor={`gt-${opt.id}`}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer bg-white transition-all ${state.group_treatment === opt.id ? "border-slate-900" : "border-slate-200 hover:border-slate-400"}`}
                  >
                    <RadioGroupItem id={`gt-${opt.id}`} value={opt.id} className="mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{opt.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{opt.hint}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {fairnessOptions.length > 0 && (
            <div className="p-5 rounded-lg border border-teal-200 bg-teal-50/30">
              <div className="flex items-center justify-between mb-3">
                <div className="font-sans text-slate-900 font-medium flex items-center gap-2">
                  Fairness metrics
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">0 means fairness</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-teal-700">
                  {state.fairness_metrics.length} selected
                </div>
              </div>
              <div className="space-y-2">
                {fairnessOptions.map((m) => (
                  <MetricRow
                    key={m.id}
                    name={m.id}
                    info={m.info}
                    checked={fairChecked(m.id)}
                    weight={fairWeight(m.id)}
                    onToggle={() => toggleFair(m.id)}
                    onWeight={(w) => setFairWeight(m.id, w)}
                    color="teal"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-2 p-4 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-sm">
          <Info className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
          <div>Fairness methods are disabled — only effectiveness metrics will be computed.</div>
        </div>
      )}

      <Collapsible open={effOpen} onOpenChange={setEffOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            data-testid="effectiveness-collapsible-trigger"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="font-sans text-slate-900 font-medium">Effectiveness metrics</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-blue-700">
                {state.effectiveness_metrics.length} selected
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${effOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {effectivenessList.map((m) => (
            <MetricRow
              key={m}
              name={m}
              info={EFFECTIVENESS_INFO[m] || ""}
              checked={effChecked(m)}
              weight={effWeight(m)}
              onToggle={() => toggleEff(m)}
              onWeight={(w) => setEffWeight(m, w)}
              color="blue"
              recommended={imbalanced && ["balanced_accuracy", "f1_macro"].includes(m)}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
