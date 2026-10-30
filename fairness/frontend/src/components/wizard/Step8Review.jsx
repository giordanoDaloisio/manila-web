import { useWizard } from "@/context/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, FileCode2, Play } from "lucide-react";

export default function Step7Review({ onEdit, onShowScript, onDownloadScript, onRun }) {
  const { state, update, updateValidation } = useWizard();
  const v = state.validation;
  const profile = state.dataset.profile || {};
  const classCounts = profile.class_counts || [];
  const minimumClassCount = classCounts.length ? Math.min(...classCounts.map((item) => item.count)) : null;
  const usableRows = state.task_type === "regression"
    ? (profile.finite_target_rows ?? profile.n_rows ?? 0)
    : Math.max(0, (profile.n_rows || 0) - (profile.target_missing_rows || 0));
  const testRows = Math.ceil(usableRows * (1 - (v.split || 80) / 100));
  const trainRows = usableRows - testRows;
  const splitUnavailable = state.task_type === "classification"
    ? classCounts.length > 0 && (minimumClassCount < 2 || Math.min(testRows, trainRows) < classCounts.length)
    : usableRows < 2;
  const maxValidFolds = state.task_type === "classification" ? minimumClassCount : usableRows;
  const foldsUnavailable = maxValidFolds !== null && maxValidFolds < v.k;

  return (
    <div data-testid="step-8-review">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 8</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Validation &amp; review</h2>
        <p className="text-slate-600">Pick a validation strategy, name your experiment, and review the full configuration.</p>
      </div>

      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50/60 p-4" role="note">
        <div className="font-medium text-sm text-slate-900">Validation recommendation</div>
        <p className="mt-1 text-sm text-slate-600">
          {state.task_type === "classification"
            ? "Stratified K-Fold is the preferred comparison when every class has enough rows: each fold approximately preserves the target-class proportions. Keep the same folds and seed when comparing models."
            : "K-Fold is a useful default for comparing regression models; it evaluates each row in a held-out fold. Keep the same folds and seed across models."}
        </p>
        {minimumClassCount !== null && <p className="mt-2 text-xs text-slate-700">Smallest class: {minimumClassCount} rows. A k-fold run requires at least k rows in every class.</p>}
        {splitUnavailable && v.method === "train_test" && <p className="mt-2 text-sm text-amber-900">The current train/test split cannot place every required class in both partitions. Adjust the split or add examples before running.</p>}
        {foldsUnavailable && (v.method === "kfold" || v.method === "stratified_kfold") && <p className="mt-2 text-sm text-amber-900">The selected fold count exceeds the available target rows ({maxValidFolds ?? 0}). Reduce k or add examples before running.</p>}
      </div>

      <div className="mb-8">
        <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-3 block">Validation strategy</Label>
        <RadioGroup value={v.method} onValueChange={(val) => updateValidation({ method: val })} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "train_test", label: "Train / Test Split", disabled: splitUnavailable, reason: state.task_type === "classification" ? "This split would leave too few rows to represent every target class in both train and test sets. Change the split or collect more minority-class examples." : "At least two rows with finite target values are required for a train/test split." },
            { id: "kfold", label: "K-Fold", disabled: foldsUnavailable, reason: state.task_type === "classification" ? `Each class needs at least ${v.k} rows for ${v.k}-fold cross-validation; the smallest class has ${minimumClassCount ?? "unknown"}. Reduce k or collect more examples.` : `At least ${v.k} rows with finite target values are required for ${v.k}-fold cross-validation; this dataset has ${usableRows}.` },
            { id: "stratified_kfold", label: "Stratified K-Fold", disabled: foldsUnavailable || state.task_type !== "classification", reason: state.task_type !== "classification" ? "Stratification applies to class labels. For a continuous target, use K-Fold or a train/test split." : `Each class needs at least ${v.k} rows for ${v.k}-fold cross-validation; the smallest class has ${minimumClassCount ?? "unknown"}. Reduce k or collect more examples.` },
          ].map((opt) => (
            <Label
              key={opt.id}
              data-testid={`validation-${opt.id}`}
              htmlFor={`val-${opt.id}`}
              className={`flex items-start gap-3 p-4 rounded-lg border bg-white transition-all ${opt.disabled ? "cursor-not-allowed border-slate-200 opacity-60" : "cursor-pointer border-slate-200 hover:border-slate-400"} ${v.method === opt.id ? "border-slate-900" : ""}`}
            >
              <RadioGroupItem id={`val-${opt.id}`} value={opt.id} disabled={opt.disabled} />
              <span>
                <span className="block font-medium text-sm text-slate-900">{opt.label}</span>
                {opt.disabled && <span className="mt-1 block text-xs leading-relaxed text-amber-900">Unavailable: {opt.reason}</span>}
              </span>
            </Label>
          ))}
        </RadioGroup>

        <div className="mt-4">
          {v.method === "train_test" && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Train / Test Split</Label>
                <div className="font-mono text-sm text-slate-900">{v.split}% / {100 - v.split}%</div>
              </div>
              <Slider
                data-testid="split-slider"
                min={50}
                max={95}
                step={5}
                value={[v.split]}
                onValueChange={([val]) => updateValidation({ split: val })}
              />
            </div>
          )}
          {(v.method === "kfold" || v.method === "stratified_kfold") && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 max-w-xs">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Number of folds (k)</Label>
              <Input
                data-testid="kfold-input"
                type="number"
                min={2}
                max={Math.max(2, Math.min(20, maxValidFolds || 20))}
                value={v.k}
                onChange={(e) => updateValidation({ k: Math.max(2, Math.min(parseInt(e.target.value) || 5, maxValidFolds || 20)) })}
                className="font-mono"
              />
              {foldsUnavailable && <p className="mt-2 text-xs text-amber-900">Unavailable at k={v.k}: reduce the fold count to at most {maxValidFolds} based on available target rows.</p>}
            </div>
          )}
        </div>
        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 max-w-xs">
          <Label htmlFor="random-seed-input" className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Random seed</Label>
          <Input
            id="random-seed-input"
            data-testid="random-seed-input"
            type="number"
            min={0}
            max={4294967295}
            value={v.random_seed ?? 42}
            onChange={(e) => updateValidation({ random_seed: Math.max(0, Math.min(4294967295, parseInt(e.target.value, 10) || 0)) })}
            className="font-mono"
          />
          <p className="text-xs text-slate-500 mt-2">Keeps model fitting and threshold optimization reproducible.</p>
        </div>
      </div>

      <div className="mb-8">
        <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Experiment name</Label>
        <Input
          data-testid="experiment-name-input"
          value={state.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Adult Income – Fairness benchmark"
          className="text-base font-medium max-w-lg"
        />
      </div>

      <div className="border-t border-slate-200 pt-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-sans text-xl font-semibold text-slate-900">Configuration summary</h3>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {estimatedCombos(state)} combinations
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryRow label="Dataset" step={1} onEdit={onEdit} value={state.dataset.name || "—"} sub={`label: ${state.dataset.label_column || "—"} · positive: ${state.dataset.positive_label || "—"}`} tags={state.dataset.sensitive_attrs} />
          <SummaryRow label="Scaler" step={2} onEdit={onEdit} value={state.scaler} />
          <SummaryRow label="Task & models" step={3} onEdit={onEdit} value={state.task_type} tags={state.models} />
          <SummaryRow label="Fairness methods" step={4} onEdit={onEdit} value={state.fairness_enabled ? "Enabled" : "Disabled"} tags={state.fairness_enabled ? state.fairness_methods : []} />
          <SummaryRow label="Metrics" step={5} onEdit={onEdit} value={`${state.effectiveness_metrics.length} effectiveness · ${state.fairness_metrics.length} fairness`} tags={[...state.effectiveness_metrics, ...state.fairness_metrics].map((m) => `${m.name} (w=${m.weight})`)} />
          <SummaryRow label="Trade-off" step={6} onEdit={onEdit} value={state.tradeoff.strategy === "pareto" ? "Pareto front" : state.tradeoff.strategy === "primary_metric" ? `Primary metric · ${state.tradeoff.primary_metric || "—"}` : `Aggregation · ${state.tradeoff.aggregation || "—"}`} />
          <SummaryRow label="Charts" step={7} onEdit={onEdit} value={`${state.graph_options?.length || 0} selected`} tags={state.graph_options || []} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-10">
        <Button
          data-testid="download-script-btn"
          onClick={onDownloadScript}
          variant="outline"
          className="border-slate-300 flex-1 h-12"
        >
          <FileCode2 className="w-4 h-4 mr-2" strokeWidth={1.5} /> Download runnable script
        </Button>
        <Button
          data-testid="preview-script-btn"
          onClick={onShowScript}
          variant="outline"
          className="border-slate-300 flex-1 h-12"
        >
          <FileCode2 className="w-4 h-4 mr-2" strokeWidth={1.5} /> Preview script
        </Button>
        <Button
          data-testid="run-experiment-btn"
          onClick={onRun}
          className="bg-slate-900 hover:bg-slate-800 text-white flex-1 h-12"
        >
          <Play className="w-4 h-4 mr-2" strokeWidth={2} /> Run on server
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, sub, tags, step, onEdit }) {
  return (
    <Card className="p-4 border-slate-200 bg-white" data-testid={`summary-row-${step}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
        <button
          data-testid={`edit-step-${step}`}
          onClick={() => onEdit(step)}
          className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
        >
          <Pencil className="w-3 h-3" strokeWidth={1.5} /> Edit
        </button>
      </div>
      <div className="font-sans font-medium text-slate-900 capitalize">{String(value)}</div>
      {sub && <div className="text-xs text-slate-500 mt-1 font-mono">{sub}</div>}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map((t, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">{typeof t === "string" ? t : t.name}</span>
          ))}
        </div>
      )}
    </Card>
  );
}

function estimatedCombos(s) {
  const methods = s.task_type === "classification" && s.fairness_enabled
    ? ["No Method", ...s.fairness_methods.filter((method) => method !== "No Method")]
    : ["No Method"];
  let total = 0;
  for (const m of s.models) {
    for (const method of methods) {
      if (method === "Reweighing" && m.includes("MLP")) continue;
      total += 1;
    }
  }
  return total;
}
