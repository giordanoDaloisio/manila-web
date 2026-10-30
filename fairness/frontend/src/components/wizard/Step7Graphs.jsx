import { useEffect, useMemo } from "react";
import { useWizard } from "@/context/WizardContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { METRIC_LABELS } from "@/lib/fairbench";

const GRAPH_OPTIONS = [
  { id: "tradeoff_score", title: "Trade-off score bars", detail: "Rank model and mitigation combinations by their overall score." },
  { id: "metric_scatter", title: "Metric scatter plot", detail: "Plot any two selected effectiveness or fairness metrics against each other." },
  { id: "fairness_gaps", title: "Fairness gap chart", detail: "Compare the selected demographic-parity and equalized-odds gaps." },
  { id: "runtime", title: "Runtime comparison", detail: "Compare evaluation time across model and mitigation combinations." },
  { id: "metric_comparison", title: "Metric comparison", detail: "Compare every combination using the first selected effectiveness metric." },
  { id: "metric_stability", title: "Metric stability", detail: "Show metric means and standard deviation across validation folds." },
  { id: "pareto_plot", title: "Pareto objective plot", detail: "Plot a selected pair; Pareto highlighting is calculated across all selected objectives." },
];

const AXIS_GRAPHS = new Set(["metric_scatter", "pareto_plot"]);

function metricDirection(name, fairnessNames) {
  if (fairnessNames.includes(name)) return "lower gap is better";
  if (name === "mean_absolute_error") return "lower error is better";
  return "higher is better";
}

export default function Step7Graphs() {
  const { state, update } = useWizard();
  const selected = useMemo(() => state.graph_options || [], [state.graph_options]);
  const objectiveMetrics = useMemo(() => [
    ...state.effectiveness_metrics.map((metric) => metric.name),
    ...(state.fairness_enabled ? state.fairness_metrics.map((metric) => metric.name) : []),
  ], [state.effectiveness_metrics, state.fairness_enabled, state.fairness_metrics]);
  const fairnessNames = state.fairness_enabled ? state.fairness_metrics.map((metric) => metric.name) : [];
  const fairnessAvailable = state.fairness_enabled
    && state.task_type === "classification"
    && state.dataset.profile?.n_classes === 2
    && state.dataset.sensitive_attrs.length > 0
    && state.fairness_metrics.length > 0;
  const pairAvailable = objectiveMetrics.length >= 2;

  useEffect(() => {
    const cleaned = selected.filter((id) => (
      (id !== "fairness_gaps" || fairnessAvailable)
      && (!AXIS_GRAPHS.has(id) || pairAvailable)
    ));
    const previousAxes = state.graph_axes || {};
    const graph_axes = { ...previousAxes };
    for (const graph of AXIS_GRAPHS) {
      const previous = previousAxes[graph] || {};
      const x = objectiveMetrics.includes(previous.x) ? previous.x : objectiveMetrics[0] || null;
      const y = objectiveMetrics.includes(previous.y) && previous.y !== x
        ? previous.y
        : objectiveMetrics.find((name) => name !== x) || null;
      graph_axes[graph] = { x, y };
    }
    const axesChanged = JSON.stringify(graph_axes) !== JSON.stringify(previousAxes);
    if (cleaned.length !== selected.length || axesChanged) update({ graph_options: cleaned, graph_axes });
  }, [selected, fairnessAvailable, pairAvailable, objectiveMetrics, state.graph_axes, update]);

  function toggle(id, checked) {
    const next = checked ? [...selected, id] : selected.filter((item) => item !== id);
    update({ graph_options: next });
  }

  function setAxis(graph, axis, value) {
    update({ graph_axes: { ...state.graph_axes, [graph]: { ...state.graph_axes?.[graph], [axis]: value } } });
  }

  return (
    <div data-testid="step-7-graphs">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 7</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Choose result charts</h2>
        <p className="text-slate-600">Select result views and set scatter-plot axes from the metrics measured by this experiment.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {GRAPH_OPTIONS.map((option) => {
          const disabled = (option.id === "fairness_gaps" && !fairnessAvailable) || (AXIS_GRAPHS.has(option.id) && !pairAvailable);
          return (
            <div key={option.id} data-testid={`graph-option-${option.id}`} className={`rounded-lg border p-4 transition-colors ${disabled ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"} ${selected.includes(option.id) ? "ring-1 ring-slate-900" : ""}`}>
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`graph-${option.id}`}
                  checked={selected.includes(option.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggle(option.id, checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor={`graph-${option.id}`} className={`block text-sm font-semibold text-slate-900 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>{option.title}</Label>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{option.detail}</p>
                  {option.id === "fairness_gaps" && !fairnessAvailable && <p className="mt-2 text-xs text-amber-800">Unavailable until fairness analysis is on, the target is binary, a sensitive attribute is selected, and at least one fairness metric is enabled.</p>}
                  {AXIS_GRAPHS.has(option.id) && !pairAvailable && <p className="mt-2 text-xs text-amber-800">Select at least two effectiveness/fairness metrics in Step 5 to enable metric axes.</p>}
                </div>
              </div>
              {AXIS_GRAPHS.has(option.id) && selected.includes(option.id) && pairAvailable && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  {["x", "y"].map((axis) => {
                    const chosen = state.graph_axes?.[option.id]?.[axis];
                    const value = objectiveMetrics.includes(chosen) ? chosen : objectiveMetrics[axis === "x" ? 0 : 1];
                    return (
                      <div key={axis}>
                        <Label htmlFor={`${option.id}-${axis}-axis`} className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500">{axis.toUpperCase()} axis · {metricDirection(value, fairnessNames)}</Label>
                        <Select value={value} onValueChange={(metric) => setAxis(option.id, axis, metric)}>
                          <SelectTrigger id={`${option.id}-${axis}-axis`} data-testid={`${option.id}-${axis}-axis`}><SelectValue /></SelectTrigger>
                          <SelectContent>{objectiveMetrics.filter((metric) => axis !== "y" || metric !== state.graph_axes?.[option.id]?.x).map((metric) => <SelectItem key={metric} value={metric}>{METRIC_LABELS[metric] || metric} · {metricDirection(metric, fairnessNames)}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4" role="note">
        <p className="text-sm font-medium text-slate-900">ML interpretation</p>
        <p className="mt-1 text-xs leading-5 text-slate-700">Axes show the measured metric values in their original units. Accuracy-style metrics are better higher; mean absolute error and fairness gaps are better lower. Pareto status is computed using direction-normalized values for every selected objective, not only the two displayed axes. Points with an unavailable fairness value are omitted from plots using that fairness axis.</p>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4" role="status" aria-live="polite">
        <p className="text-sm font-medium text-slate-900">{selected.length} chart{selected.length === 1 ? "" : "s"} selected</p>
        <p className="mt-1 text-xs text-slate-600">At least one chart is required. You can change chart axes again in the results view.</p>
      </div>
    </div>
  );
}
