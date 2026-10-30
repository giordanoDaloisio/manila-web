import { useWizard } from "@/context/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, FileCode2, Play } from "lucide-react";

export default function Step7Review({ onEdit, onShowScript, onRun }) {
  const { state, update, updateValidation } = useWizard();
  const v = state.validation;

  return (
    <div data-testid="step-7-review">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 7</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Validation &amp; review</h2>
        <p className="text-slate-600">Pick a validation strategy, name your experiment, and review the full configuration.</p>
      </div>

      <div className="mb-8">
        <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-3 block">Validation strategy</Label>
        <RadioGroup value={v.method} onValueChange={(val) => updateValidation({ method: val })} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "train_test", label: "Train / Test Split" },
            { id: "kfold", label: "K-Fold" },
            { id: "stratified_kfold", label: "Stratified K-Fold" },
          ].map((opt) => (
            <Label
              key={opt.id}
              data-testid={`validation-${opt.id}`}
              htmlFor={`val-${opt.id}`}
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer bg-white transition-all ${v.method === opt.id ? "border-slate-900" : "border-slate-200 hover:border-slate-400"}`}
            >
              <RadioGroupItem id={`val-${opt.id}`} value={opt.id} />
              <span className="font-medium text-sm text-slate-900">{opt.label}</span>
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
                max={20}
                value={v.k}
                onChange={(e) => updateValidation({ k: parseInt(e.target.value) || 5 })}
                className="font-mono"
              />
            </div>
          )}
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
          <SummaryRow label="Trade-off" step={6} onEdit={onEdit} value={state.tradeoff.strategy === "pareto" ? "Pareto front" : `Aggregation · ${state.tradeoff.aggregation || "—"}`} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-10">
        <Button
          data-testid="download-script-btn"
          onClick={onShowScript}
          variant="outline"
          className="border-slate-300 flex-1 h-12"
        >
          <FileCode2 className="w-4 h-4 mr-2" strokeWidth={1.5} /> Preview experiment script
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
  const methods = s.fairness_enabled && s.fairness_methods.length ? s.fairness_methods : ["No Method"];
  let total = 0;
  for (const m of s.models) {
    for (const method of methods) {
      if (method === "Reweighing" && m.includes("MLP")) continue;
      total += 1;
    }
  }
  return total;
}
