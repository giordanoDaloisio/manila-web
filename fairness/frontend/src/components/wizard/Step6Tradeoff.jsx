import { useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { METRIC_LABELS } from "@/lib/fairbench";

export default function Step6Tradeoff() {
  const { state, update, updateTradeoff } = useWizard();
  const t = state.tradeoff;
  const selectedMetrics = [
    ...state.effectiveness_metrics,
    ...(state.fairness_enabled ? state.fairness_metrics : []),
  ];
  const selectedNames = selectedMetrics.map((metric) => metric.name);
  const primaryMetric = selectedNames.includes(t.primary_metric) ? t.primary_metric : selectedNames[0];
  useEffect(() => {
    if (t.strategy === "primary_metric" && primaryMetric && t.primary_metric !== primaryMetric) {
      updateTradeoff({ primary_metric: primaryMetric });
    }
  }, [t.strategy, t.primary_metric, primaryMetric, updateTradeoff]);
  const setMetricWeight = (name, weight) => {
    const safeWeight = Math.min(1, Math.max(0, Number.isFinite(weight) ? weight : 0));
    update({
      effectiveness_metrics: state.effectiveness_metrics.map((metric) => metric.name === name ? { ...metric, weight: safeWeight } : metric),
      fairness_metrics: state.fairness_metrics.map((metric) => metric.name === name ? { ...metric, weight: safeWeight } : metric),
    });
  };

  return (
    <div data-testid="step-6-tradeoff">
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">Step 6</div>
        <h2 className="font-sans text-3xl font-bold text-slate-900 mb-2">Trade-off strategy</h2>
        <p className="text-slate-600">Choose how the model combinations are compared. Each metric is first converted to a relative utility score from 0 to 1, with higher always better.</p>
      </div>

      <RadioGroup value={t.strategy} onValueChange={(v) => updateTradeoff({ strategy: v, ...(v === "primary_metric" && primaryMetric ? { primary_metric: primaryMetric } : {}) })} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Label data-testid="tradeoff-aggregation" htmlFor="tradeoff-aggregation" className={`flex flex-col gap-3 p-5 rounded-lg border cursor-pointer transition-all bg-white ${t.strategy === "aggregation" ? "border-slate-900" : "border-slate-200 hover:border-slate-400"}`}>
          <div className="flex items-start gap-3">
            <RadioGroupItem id="tradeoff-aggregation" value="aggregation" className="mt-0.5" />
            <div>
              <div className="font-sans font-semibold text-slate-900">Aggregate selected metrics</div>
              <div className="text-sm text-slate-600 mt-1">Combine all selected effectiveness and fairness objectives into one score.</div>
            </div>
          </div>
          {t.strategy === "aggregation" && (
            <div className="pl-7 space-y-3">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Scoring rule</Label>
              <Select value={t.aggregation || "mean"} onValueChange={(v) => updateTradeoff({ aggregation: v })}>
                <SelectTrigger data-testid="aggregation-select" className="w-full max-w-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mean">Mean normalized score</SelectItem>
                  <SelectItem value="harmonic_mean">Harmonic mean</SelectItem>
                  <SelectItem value="weighted_sum">Weighted sum</SelectItem>
                </SelectContent>
              </Select>
              {t.aggregation === "weighted_sum" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Set each selected metric's contribution (0–1). The total is the sum of utility × weight; zero excludes a metric.</p>
                  {selectedMetrics.map((metric) => (
                    <div key={metric.name} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 text-slate-700">{METRIC_LABELS[metric.name] || metric.name}</span>
                      <Input aria-label={`${METRIC_LABELS[metric.name] || metric.name} weight`} type="number" min="0" max="1" step="0.1" value={metric.weight ?? 1} onChange={(event) => setMetricWeight(metric.name, Number.parseFloat(event.target.value))} className="h-8 w-20 font-mono text-xs" />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">Mean gives equal importance. Harmonic mean penalizes a low score on any objective. Weights are used only by weighted sum.</p>
            </div>
          )}
        </Label>

        <Label data-testid="tradeoff-primary-metric" htmlFor="tradeoff-primary-metric" className={`flex flex-col gap-3 p-5 rounded-lg border cursor-pointer transition-all bg-white ${t.strategy === "primary_metric" ? "border-slate-900" : "border-slate-200 hover:border-slate-400"}`}>
          <div className="flex items-start gap-3">
            <RadioGroupItem id="tradeoff-primary-metric" value="primary_metric" className="mt-0.5" />
            <div>
              <div className="font-sans font-semibold text-slate-900">Use one primary metric</div>
              <div className="text-sm text-slate-600 mt-1">Choose the winner by the metric selected below; other metrics remain available for comparison.</div>
            </div>
          </div>
          {t.strategy === "primary_metric" && (
            <div className="pl-7">
              {selectedMetrics.length ? (
                <>
                  <Label htmlFor="primary-metric-select" className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">Primary metric from Step 5</Label>
                  <Select value={primaryMetric || ""} onValueChange={(v) => updateTradeoff({ primary_metric: v })}>
                    <SelectTrigger id="primary-metric-select" data-testid="primary-metric-select" className="w-full max-w-xs"><SelectValue placeholder="Select a metric…" /></SelectTrigger>
                    <SelectContent>{selectedMetrics.map((metric) => <SelectItem key={metric.name} value={metric.name}>{METRIC_LABELS[metric.name] || metric.name}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              ) : <p className="text-sm text-amber-800">Select an effectiveness metric in Step 5 first.</p>}
            </div>
          )}
        </Label>

        <Label data-testid="tradeoff-pareto" htmlFor="tradeoff-pareto" className={`flex items-start gap-3 p-5 rounded-lg border cursor-pointer transition-all bg-white ${t.strategy === "pareto" ? "border-slate-900" : "border-slate-200 hover:border-slate-400"}`}>
          <RadioGroupItem id="tradeoff-pareto" value="pareto" className="mt-0.5" />
          <div>
            <div className="font-sans font-semibold text-slate-900">Pareto front</div>
            <div className="text-sm text-slate-600 mt-1">Keep non-dominated combinations, then select a representative from that set using the chosen aggregate scoring rule.</div>
          </div>
        </Label>
      </RadioGroup>
    </div>
  );
}
