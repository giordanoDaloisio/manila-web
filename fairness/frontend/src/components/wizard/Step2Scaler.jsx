import { useWizard } from "@/context/WizardContext";
import { SCALERS } from "@/lib/fairbench";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Step2Scaler() {
  const { state, update } = useWizard();
  const scaleSensitiveModels = new Set([
    "Logistic Regression", "Support Vector Classifier", "Linear SVC", "Gradient Descent Classifier",
    "MLP Classifier", "K-Nearest Neighbors Classifier", "Linear Regression", "Ridge Regression",
  ]);
  const selectedScaleSensitive = state.models.filter((model) => scaleSensitiveModels.has(model));
  const selectedModels = state.models;
  const onlyTreeModels = selectedModels.length > 0 && selectedModels.every((model) => /Tree|Forest|Boosting|AdaBoost/.test(model));

  return (
    <div data-testid="step-2-scaler">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 2</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Feature scaling</h2>
        <p className="text-slate-600">Numerical features can be re-scaled before training. Pick one strategy.</p>
      </div>

      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50/60 p-4" role="note">
        <div className="font-medium text-sm text-slate-900">Scaling suggestion</div>
        <p className="mt-1 text-sm text-slate-600">
          {selectedScaleSensitive.length > 0
            ? `StandardScaler is a sensible starting point because ${selectedScaleSensitive.join(", ")} use distances, gradients, or regularization that can be affected by feature scale. Scaling is fit inside each training fold.`
            : onlyTreeModels
              ? "The selected tree models split on feature values and are generally insensitive to monotonic feature scaling. None is a reasonable starting point; scaling is still available for comparison."
              : "Choose models in Step 3 for a more specific scaling suggestion. StandardScaler is a common starting point for linear, distance-based, and neural models."}
        </p>
      </div>

      <RadioGroup value={state.scaler} onValueChange={(v) => update({ scaler: v })} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SCALERS.map((s) => (
          <Label
            key={s.id}
            htmlFor={`scaler-${s.id}`}
            data-testid={`scaler-option-${s.id}`}
            className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
              state.scaler === s.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400 bg-white"
            }`}
          >
            <RadioGroupItem value={s.id} id={`scaler-${s.id}`} className="mt-1" />
            <div>
              <div className="font-sans font-semibold text-slate-900">{s.name}</div>
              <div className="text-sm text-slate-600 mt-1">{s.description}</div>
              {((selectedScaleSensitive.length > 0 && s.id === "StandardScaler") || (onlyTreeModels && s.id === "None")) && <div className="mt-2 text-xs font-medium text-teal-800">Suggested for the selected models</div>}
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
