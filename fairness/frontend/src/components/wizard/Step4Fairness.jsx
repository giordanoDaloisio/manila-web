import { useWizard } from "@/context/WizardContext";
import { FAIRNESS_METHOD_GROUPS } from "@/lib/fairbench";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

export default function Step4Fairness() {
  const { state, update } = useWizard();

  const isRegression = state.task_type === "regression";
  const profile = state.dataset.profile || {};
  const isBinary = state.task_type === "classification" && profile.n_classes === 2;
  const hasSensitiveAttributes = state.dataset.sensitive_attrs.length > 0;
  const modelCompatibility = state.dataset.model_compatibility || [];
  const selectedModels = modelCompatibility.filter((model) => state.models.includes(model.label));

  const toggleAll = (enabled) => {
    if (enabled) update({ fairness_enabled: true, fairness_methods: state.fairness_methods.length ? state.fairness_methods : ["No Method"] });
    else update({
      fairness_enabled: false,
      fairness_methods: [],
      fairness_metrics: [],
      graph_options: (state.graph_options || []).filter((option) => option !== "fairness_gaps"),
    });
  };

  const toggleMethod = (id) => {
    if (!state.fairness_enabled) return;
    const has = state.fairness_methods.includes(id);
    update({ fairness_methods: has ? state.fairness_methods.filter((x) => x !== id) : [...state.fairness_methods, id] });
  };

  return (
    <div data-testid="step-4-fairness">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 4</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Fairness methods</h2>
        <p className="text-slate-600">Choose bias-mitigation techniques to compare alongside the baseline "No Method".</p>
      </div>

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/60 p-4" role="note">
        <div className="font-medium text-sm text-slate-900">Choosing a fairness criterion</div>
        <p className="mt-1 text-sm text-slate-600">The app does not rank one fairness definition as universally best: demographic parity, equalized odds, and equal opportunity encode different policy goals and can conflict. Select the criterion that matches the decision context. The unmitigated baseline is included for comparison.</p>
      </div>

      {isRegression && (
        <div className="mb-6 p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
          <div>Regression task is selected in Step 3 — fairness methods are not compatible and are disabled here.</div>
        </div>
      )}

      {!isRegression && !isBinary && (
        <div className="mb-6 p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
          <div>The current mitigation algorithms and group metrics require exactly two target classes. This target has {profile.n_classes ?? "an unknown number of"} class{profile.n_classes === 1 ? "" : "es"}; turn fairness analysis off or select a binary target.</div>
        </div>
      )}

      {!hasSensitiveAttributes && !isRegression && (
        <div className="mb-6 p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
          <div>Choose at least one sensitive/protected feature in Step 1. Without it, group fairness metrics and group-aware mitigation cannot be computed.</div>
        </div>
      )}

      {isBinary && hasSensitiveAttributes && selectedModels.length === 0 && (
        <div className="mb-6 p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
          <div>Select a compatible binary classifier in Step 3 to check which mitigations its fitting interface supports.</div>
        </div>
      )}

      <div className={`flex items-center justify-between p-4 rounded-lg border ${isRegression ? "bg-slate-100 border-slate-200 opacity-70" : "bg-teal-50 border-teal-200"} mb-6`}>
        <div>
          <div className="font-sans font-semibold text-slate-900">Apply fairness methods</div>
          <div className="text-sm text-slate-600 mt-1">
            When off, only effectiveness metrics will be computed.
          </div>
        </div>
        <Switch
          data-testid="fairness-toggle"
          checked={state.fairness_enabled && !isRegression}
          onCheckedChange={toggleAll}
          disabled={isRegression}
        />
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${(!state.fairness_enabled || isRegression) ? "opacity-50 pointer-events-none" : ""}`}>
        {FAIRNESS_METHOD_GROUPS.map((g) => (
          <div key={g.group}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">{g.group}</div>
            <div className="space-y-2">
              {g.methods.map((m) => {
                const incompatibility = selectedModels.map((model) => model.fairness_methods?.[m.sourceId]).find((entry) => entry?.compatible === false);
                const checked = state.fairness_methods.includes(m.id);
                const disabled = !isBinary || !hasSensitiveAttributes || selectedModels.length === 0 || Boolean(incompatibility);
                const unavailableReason = !isBinary
                  ? "This mitigation requires a binary classification target."
                  : !hasSensitiveAttributes
                    ? "Select a sensitive/protected feature in Step 1 to define the groups being compared."
                    : selectedModels.length === 0
                      ? "Select a compatible binary classifier in Step 3 to evaluate this mitigation."
                      : incompatibility?.reason;

                const row = (
                  <Label
                    data-testid={`fairness-method-${m.id.replace(/\s+/g, "-")}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      disabled ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed" :
                      checked ? "border-teal-700 bg-teal-50" : "border-slate-200 hover:border-slate-400 bg-white"
                    }`}
                  >
                    <Checkbox
                      checked={checked && !disabled}
                      disabled={disabled}
                      onCheckedChange={() => !disabled && toggleMethod(m.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-sans font-medium text-slate-900 text-sm">{m.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.info}</div>
                      {disabled && <div className="mt-2 text-xs leading-relaxed text-amber-900">Unavailable: {unavailableReason || "This method is incompatible with the selected model."}</div>}
                    </div>
                  </Label>
                );

                return <div key={m.id}>{row}</div>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
