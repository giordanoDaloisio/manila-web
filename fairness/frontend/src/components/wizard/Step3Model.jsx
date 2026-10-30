import { useWizard } from "@/context/WizardContext";
import { CLASSIFICATION_MODELS, REGRESSION_MODELS, FAIRNESS_METHOD_GROUPS } from "@/lib/fairbench";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Step3Model() {
  const { state, update } = useWizard();

  const fairnessBlocksRegression =
    state.fairness_enabled && state.fairness_methods.some((m) => m !== "No Method");
  const inferredTask = state.dataset.profile?.task_type;

  const setTask = (task) => {
    if (inferredTask && inferredTask !== task) return;
    // Clear models when switching task type
    update({ task_type: task, models: [] });
  };

  const toggleModel = (m) => {
    const has = state.models.includes(m);
    const nextModels = has ? state.models.filter((x) => x !== m) : [...state.models, m];
    const methods = FAIRNESS_METHOD_GROUPS.flatMap((group) => group.methods);
    const removedMethods = state.fairness_methods.filter((method) => {
      const methodInfo = methods.find((item) => item.id === method);
      return methodInfo?.sourceId && nextModels.some((model) => {
        const compatibility = (state.dataset.model_compatibility || []).find((item) => item.label === model);
        return compatibility?.fairness_methods?.[methodInfo.sourceId]?.compatible === false;
      });
    });
    update({ models: nextModels, fairness_methods: state.fairness_methods.filter((method) => !removedMethods.includes(method)) });
    if (removedMethods.length) toast.info("Incompatible fairness methods cleared", { description: removedMethods.join(", ") });
  };

  const models = state.task_type === "classification" ? CLASSIFICATION_MODELS : REGRESSION_MODELS;
  const compatibility = state.dataset.model_compatibility || [];
  const smallSample = (state.dataset.profile?.n_rows || 0) < 100;

  return (
    <div data-testid="step-3-model">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 3</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Task type &amp; models</h2>
        <p className="text-slate-600">Pick the task type, then select one or more models to benchmark.</p>
      </div>

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/60 p-4" role="note">
        <div className="font-medium text-sm text-slate-900">How recommendations work</div>
        <p className="mt-1 text-sm text-slate-600">
          Suggestions are rule-based starting points from the inferred target type and model capabilities, not predictions of which model will win. Compare compatible models with the same validation splits.
        </p>
        {smallSample && <p className="mt-2 text-sm text-amber-800">Suggestions are marked exploratory for datasets under 100 rows. This is a conservative interface warning, not a universal sample-size rule; model reliability depends on class/group support and the use case.</p>}
      </div>

      <div className="mb-8">
        <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-3 block">Task type</Label>
        <RadioGroup value={state.task_type} onValueChange={setTask} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Label
            htmlFor="task-classification"
            data-testid="task-classification"
            className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all border-slate-200 hover:border-slate-400 bg-white data-[state=on]:border-slate-900"
          >
            <RadioGroupItem value="classification" id="task-classification" className="mt-1" disabled={inferredTask === "regression" || inferredTask === "unknown"} />
            <div>
              <div className="font-sans font-semibold text-slate-900">Classification</div>
              <div className="text-sm text-slate-600 mt-1">Predict a discrete label. Available fairness methods still depend on class count, sensitive attributes, and model capabilities.</div>
              {inferredTask === "regression" && <div className="mt-2 text-xs text-amber-800">Unavailable: the selected target is continuous, so it is inferred as regression.</div>}
            </div>
          </Label>

          {fairnessBlocksRegression ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  data-testid="task-regression-disabled"
                  className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                >
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 mt-1" />
                  <div>
                    <div className="font-sans font-semibold text-slate-500 flex items-center gap-2">
                      Regression <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Predict a continuous value.</div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Regression task is not compatible with fairness methods. Disable fairness methods in Step 4 to use regression.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Label
              htmlFor="task-regression"
              data-testid="task-regression"
              className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all border-slate-200 hover:border-slate-400 bg-white"
            >
              <RadioGroupItem value="regression" id="task-regression" className="mt-1" disabled={inferredTask === "classification" || inferredTask === "unknown"} />
              <div>
                <div className="font-sans font-semibold text-slate-900">Regression</div>
                <div className="text-sm text-slate-600 mt-1">Predict a continuous value. Binary-classification mitigations will be unavailable.</div>
                {inferredTask === "classification" && <div className="mt-2 text-xs text-amber-800">Unavailable: the selected target is inferred as a discrete class label.</div>}
              </div>
            </Label>
          )}
        </RadioGroup>
        {inferredTask === "unknown" && <p className="mt-3 text-sm text-amber-800">Task selection is unavailable: the chosen target has too few distinct non-missing values or its type could not be inferred. Choose another target or add valid target examples.</p>}
      </div>

      <div>
        <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-3 block">
          {state.task_type === "classification" ? "Classification" : "Regression"} models ({state.models.length} selected)
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="model-list">
          {models.map((m) => {
            const checked = state.models.includes(m);
            const modelInfo = compatibility.find((item) => item.label === m);
            const disabled = modelInfo ? !modelInfo.compatible : false;
            return (
              <Label
                key={m}
                data-testid={`model-option-${m.replace(/\s+/g, "-")}`}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${
                  checked ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400 bg-white"
                }`}
              >
                <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggleModel(m)} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-slate-800">{m}</span>
                    {modelInfo?.recommendation && <Badge variant="outline" className="border-teal-300 bg-teal-50 text-teal-800">{modelInfo.recommendation}</Badge>}
                    {disabled && <span className="text-xs font-medium text-rose-700">Unavailable</span>}
                  </div>
                  {disabled && <p className="mt-1 text-xs leading-5 text-rose-800">{modelInfo.reasons?.join(" ") || "This model is incompatible with the selected target or dataset size."}</p>}
                  {!disabled && modelInfo?.recommendation_reason && <p className="mt-1 text-xs leading-5 text-slate-600">{modelInfo.recommendation_reason}</p>}
                </div>
              </Label>
            );
          })}
        </div>
        {inferredTask === "unknown" && <p className="mt-3 text-sm text-amber-800">Models are unavailable until the selected target has at least two distinct non-empty values and its task type can be inferred.</p>}
        {state.task_type === "classification" && state.models.some((m) => m.includes("MLP")) && state.fairness_methods.includes("Reweighing") && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <Info className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
            <div>MLP is selected — <span className="font-mono">Reweighing</span> is not compatible with MLP models and will be skipped for that pairing during the run.</div>
          </div>
        )}
      </div>
    </div>
  );
}
