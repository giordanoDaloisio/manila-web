import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getExperiment, getExperimentStatus, downloadExperimentArtifact } from "@/lib/api";
import { METRIC_LABELS } from "@/lib/fairbench";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, Cell,
  ScatterChart, Scatter, ZAxis, Legend, ErrorBar,
} from "recharts";
import { ArrowUpDown, Award, Download, ArrowLeft, Sparkles, GitCompareArrows, Printer } from "lucide-react";

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState(null);
  const [sortBy, setSortBy] = useState({ col: "tradeoff_score", dir: "desc" });

  useEffect(() => {
    let active = true;
    let timer;
    const poll = async () => {
      try {
        const status = await getExperimentStatus(id);
        if (!active) return;
        setJobStatus(status);
        if (status.status === "SUCCESS") {
          const data = await getExperiment(id);
          if (active) setExperiment(data);
          if (active) setLoading(false);
          return;
        }
        if (status.status === "FAILURE") {
          setLoading(false);
          return;
        }
        setLoading(false);
        timer = window.setTimeout(poll, 1500);
      } catch (error) {
        // Backward compatibility for completed experiments saved before job polling.
        try {
          const data = await getExperiment(id);
          if (active) setExperiment(data);
        } catch {
          if (active) {
            setJobStatus({ status: "FAILURE", progress: 0, error: error?.response?.data?.detail || "Experiment not found." });
          }
        } finally {
          if (active) setLoading(false);
        }
      }
    };
    poll();
    return () => { active = false; window.clearTimeout(timer); };
  }, [id]);

  const metricNames = useMemo(() => {
    if (!experiment) return [];
    const eff = experiment.config.effectiveness_metrics.map((m) => m.name);
    const fair = experiment.config.fairness_metrics.map((m) => m.name);
    return [...eff, ...fair];
  }, [experiment]);

  const sortedCombos = useMemo(() => {
    if (!experiment) return [];
    const arr = [...experiment.results.combinations];
    arr.sort((a, b) => {
      let av, bv;
      if (sortBy.col === "tradeoff_score") { av = a.tradeoff_score; bv = b.tradeoff_score; }
      else if (sortBy.col === "model") { av = a.model; bv = b.model; }
      else if (sortBy.col === "fairness_method") { av = a.fairness_method; bv = b.fairness_method; }
      else { av = a.metrics[sortBy.col] ?? 0; bv = b.metrics[sortBy.col] ?? 0; }
      if (av < bv) return sortBy.dir === "asc" ? -1 : 1;
      if (av > bv) return sortBy.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [experiment, sortBy]);

  const toggleSort = (col) => {
    setSortBy((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  };

  const chartData = useMemo(() => {
    if (!experiment) return [];
    return experiment.results.combinations.map((c) => ({
      id: c.id,
      name: `${short(c.model)} · ${short(c.fairness_method)}`,
      score: c.tradeoff_score,
      isBest: c.id === experiment.results.best_id,
      isPareto: c.pareto_optimal,
      fairness_gap: c.metrics[experiment.config.fairness_metrics[0]?.name] || 0,
      effectiveness: c.metrics[experiment.config.effectiveness_metrics[0]?.name] || 0,
      metrics: c.metrics,
      metric_std: c.metric_std || {},
      runtime_seconds: c.runtime_seconds || 0,
      model: c.model,
      method: c.fairness_method,
    }));
  }, [experiment]);

  const bestCombo = useMemo(() => {
    if (!experiment) return null;
    return experiment.results.combinations.find((c) => c.id === experiment.results.best_id);
  }, [experiment]);

  const selectedGraphs = experiment?.config?.graph_options?.length
    ? experiment.config.graph_options
    : ["tradeoff_score"];
  const effectivenessMetrics = experiment?.config?.effectiveness_metrics.map((metric) => metric.name) || [];
  const fairnessMetrics = experiment?.config?.fairness_metrics.map((metric) => metric.name) || [];

  const downloadArtifact = async (name, filename) => {
    try {
      const blob = await downloadExperimentArtifact(id, name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded`);
    } catch (error) {
      toast.error(`Could not download ${filename}`, { description: error?.response?.data?.detail || error.message });
    }
  };

  if (loading) return <div className="text-slate-500 font-mono text-sm" data-testid="results-loading">Loading experiment…</div>;
  if (!experiment && jobStatus) return (
    <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8" data-testid="experiment-status-page">
      <Link to="/" className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900">← Back to experiments</Link>
      {jobStatus.status === "FAILURE" ? <>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Experiment failed</h1>
        <p className="mt-2 text-sm text-red-700">{jobStatus.error || "The worker could not complete this run."}</p>
      </> : <>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{jobStatus.status === "PENDING" ? "Experiment queued" : "Experiment running"}</h1>
        <p className="mt-2 text-sm text-slate-600">Progress is refreshed automatically while the worker evaluates the selected models.</p>
        <div className="mt-5 flex items-center gap-3">
          <progress className="h-2 flex-1 accent-teal-700" max="100" value={jobStatus.progress || 0} aria-label="Experiment progress" />
          <span className="font-mono text-sm text-slate-700">{Math.round(jobStatus.progress || 0)}%</span>
        </div>
      </>}
    </div>
  );
  if (!experiment) return null;

  return (
    <div className="animate-fade-in print-container" data-testid="results-page">
      <Link to="/" data-testid="back-to-dashboard" data-print="hide" className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="w-3 h-3" /> Back to experiments
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-2">Results · {experiment.config.dataset.name}</div>
            <h1 className="font-sans text-4xl font-bold text-slate-900 mb-2">{experiment.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <Badge className={experiment.config.task_type === "classification" ? "bg-teal-50 text-teal-700 border-teal-200 border font-mono text-xs" : "bg-blue-50 text-blue-700 border-blue-200 border font-mono text-xs"}>
                {experiment.config.task_type}
              </Badge>
              <span className="font-mono text-xs">{experiment.results.combinations.length} combinations</span>
              <span className="font-mono text-xs text-slate-400">·</span>
              <span className="font-mono text-xs">{new Date(experiment.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-2" data-print="hide">
            <Button data-testid="print-report-btn" onClick={() => window.print()} variant="outline" className="border-slate-300">
              <Printer className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} /> Print report
            </Button>
            <Button data-testid="compare-with-btn" onClick={() => navigate(`/compare?a=${experiment.id}`)} variant="outline" className="border-slate-300">
              <GitCompareArrows className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} /> Compare with…
            </Button>
            <Button data-testid="download-csv-btn" onClick={() => downloadArtifact("metrics", "metrics.csv")} variant="outline" className="border-slate-300">
              <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} /> Metrics .csv
            </Button>
            <Button data-testid="download-model-btn" onClick={() => downloadArtifact("model", "best_model.joblib")} variant="outline" className="border-slate-300">
              <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} /> Best model .joblib
            </Button>
            <Button data-testid="download-script-btn" onClick={() => downloadArtifact("script", "reproduce_experiment.py")} variant="outline" className="border-slate-300">
              <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} /> Reproduction script
            </Button>
          </div>
        </div>
      </div>

      {/* Best card */}
      {bestCombo && (
        <Card data-testid="best-combination-card" className="p-6 md:p-8 border-2 border-slate-900 bg-white mb-8 relative overflow-hidden print-card">
          <div className="absolute top-0 right-0 bg-slate-900 text-white px-4 py-1.5 rounded-bl-lg font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5">
            <Award className="w-3 h-3" strokeWidth={2} /> Best Trade-off
          </div>
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            <div className="lg:w-1/2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">Winning combination</div>
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="font-sans text-3xl font-bold text-slate-900">{bestCombo.model}</h2>
              </div>
              <div className="text-slate-600 mb-4">
                paired with <span className="font-mono text-teal-700 font-medium">{bestCombo.fairness_method}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                {experiment.results.best_reason}
              </p>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1">Trade-off score</div>
                <div className="font-mono text-3xl text-slate-900">{bestCombo.tradeoff_score.toFixed(3)}</div>
              </div>
              {Object.entries(bestCombo.metrics).slice(0, 3).map(([name, val]) => (
                <div key={name} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1 truncate">{METRIC_LABELS[name] || name}</div>
                  <div className="font-mono text-2xl text-slate-900">{typeof val === "number" ? val.toFixed(3) : val}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2" aria-label="Selected experiment charts">
        {selectedGraphs.map((graph) => (
          <ResultChart
            key={graph}
            graph={graph}
            chartData={chartData}
            effectivenessMetrics={effectivenessMetrics}
            fairnessMetrics={fairnessMetrics}
            graphAxes={experiment.config.graph_axes || {}}
          />
        ))}
      </section>

      {/* Metrics table */}
      <Card className="border-slate-200 bg-white overflow-hidden print-card" data-testid="metrics-table-card">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-sans text-lg font-semibold text-slate-900">All combinations</h3>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Click any header to sort</div>
        </div>
        <div className="overflow-x-auto code-scroll">
          <Table data-testid="metrics-table">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <SortHead label="Model" col="model" sortBy={sortBy} onClick={toggleSort} />
                <SortHead label="Fairness method" col="fairness_method" sortBy={sortBy} onClick={toggleSort} />
                <SortHead label="Trade-off" col="tradeoff_score" sortBy={sortBy} onClick={toggleSort} align="right" />
                {metricNames.map((n) => (
                  <SortHead key={n} label={METRIC_LABELS[n] || n} col={n} sortBy={sortBy} onClick={toggleSort} align="right" isFairness={experiment.config.fairness_metrics.some((m) => m.name === n)} />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCombos.map((c) => {
                const isBest = c.id === experiment.results.best_id;
                return (
                  <TableRow
                    key={c.id}
                    data-testid={`combo-row-${c.id}`}
                    className={isBest ? "bg-slate-900/[0.03] border-l-4 border-l-slate-900" : ""}
                  >
                    <TableCell className="font-sans font-medium text-slate-900 text-sm">
                      {isBest && <Award className="w-3.5 h-3.5 text-slate-900 inline mr-1.5 -mt-0.5" strokeWidth={2} />}
                      {c.model}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">{c.fairness_method}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium text-slate-900">{c.tradeoff_score.toFixed(3)}</TableCell>
                    {metricNames.map((n) => (
                      <TableCell key={n} className="text-right font-mono text-xs text-slate-700">
                        {typeof c.metrics[n] === "number" ? c.metrics[n].toFixed(3) : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="mt-8 text-center" data-print="hide">
        <Button onClick={() => navigate("/new")} data-testid="run-another-btn" variant="outline" className="border-slate-300">
          Run another experiment
        </Button>
      </div>
    </div>
  );
}

function ResultChart({ graph, chartData, effectivenessMetrics, fairnessMetrics, graphAxes }) {
  const metric = effectivenessMetrics[0];
  const secondMetric = effectivenessMetrics[1];
  const objectiveMetrics = [...effectivenessMetrics, ...fairnessMetrics];
  const configuredAxes = graphAxes?.[graph] || {};
  const defaultX = objectiveMetrics.includes(configuredAxes.x) ? configuredAxes.x : objectiveMetrics[0];
  const defaultY = objectiveMetrics.includes(configuredAxes.y) && configuredAxes.y !== defaultX
    ? configuredAxes.y
    : objectiveMetrics.find((name) => name !== defaultX);
  const [xMetric, setXMetric] = useState(defaultX);
  const [yMetric, setYMetric] = useState(defaultY);
  useEffect(() => {
    setXMetric(defaultX);
    setYMetric(defaultY);
  }, [defaultX, defaultY]);
  const fairnessData = chartData.map((row) => ({
    ...row,
    ...Object.fromEntries(fairnessMetrics.map((name) => [name, row.metrics[name]])),
  }));
  const titles = {
    tradeoff_score: ["Trade-off score", "Higher scores indicate stronger combined effectiveness and fairness."],
    metric_scatter: ["Effectiveness metric scatter", "Explore how selected effectiveness measures move together."],
    fairness_gaps: ["Fairness gaps", "A value closer to zero indicates a smaller measured group disparity."],
    runtime: ["Evaluation runtime", "Elapsed evaluation time for each model and mitigation combination."],
    metric_comparison: ["Effectiveness comparison", "Compare each combination on the first selected effectiveness metric."],
    metric_stability: ["Metric stability", "Bars show the mean; whiskers show one standard deviation across folds."],
    pareto_plot: ["Pareto objective plot", "Highlighted points are non-dominated across the selected effectiveness objectives."],
  };
  const [title, description] = titles[graph] || titles.tradeoff_score;
  const card = (chart, controls = null, notice = null) => (
    <Card className="p-6 border-slate-200 bg-white print-card" data-testid={`results-chart-${graph}`}>
      <div className="mb-5">
        <h3 className="font-sans text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {controls}
      <div className="h-80 w-full" data-testid="results-chart">
        <ResponsiveContainer>{chart}</ResponsiveContainer>
      </div>
      {notice && <p className="mt-2 text-xs text-amber-800" role="status">{notice}</p>}
    </Card>
  );
  const axisStyle = { stroke: "#64748b", fontSize: 10 };
  const tooltipStyle = { background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 };
  const numericTooltip = (value) => typeof value === "number" ? value.toFixed(3) : value;

  if (graph === "metric_scatter" || graph === "pareto_plot") {
    if (!xMetric || !yMetric) return null;
    const plottedData = chartData.filter((row) => Number.isFinite(row.metrics[xMetric]) && Number.isFinite(row.metrics[yMetric]));
    const axisDirection = (name) => fairnessMetrics.includes(name) || name === "mean_absolute_error" ? "lower is better" : "higher is better";
    const axisControls = (
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2" data-print="hide">
        {["x", "y"].map((axis) => {
          const value = axis === "x" ? xMetric : yMetric;
          return (
            <div key={axis}>
              <Label htmlFor={`${graph}-result-${axis}`} className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">{axis.toUpperCase()} axis · {axisDirection(value)}</Label>
              <Select value={value} onValueChange={(selected) => {
                if (axis === "x") {
                  setXMetric(selected);
                  if (selected === yMetric) setYMetric(objectiveMetrics.find((name) => name !== selected));
                } else {
                  setYMetric(selected);
                  if (selected === xMetric) setXMetric(objectiveMetrics.find((name) => name !== selected));
                }
              }}>
                <SelectTrigger id={`${graph}-result-${axis}`} data-testid={`${graph}-result-${axis}-select`}><SelectValue /></SelectTrigger>
                <SelectContent>{objectiveMetrics.filter((name) => name === value || name !== (axis === "x" ? yMetric : xMetric)).map((name) => <SelectItem key={name} value={name}>{METRIC_LABELS[name] || name} · {axisDirection(name)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    );
    return card(
      <ScatterChart margin={{ top: 20, right: 25, bottom: 22, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey={`metrics.${xMetric}`} name={`${METRIC_LABELS[xMetric] || xMetric} (${axisDirection(xMetric)})`} stroke={axisStyle.stroke} fontSize={axisStyle.fontSize} />
        <YAxis type="number" dataKey={`metrics.${yMetric}`} name={`${METRIC_LABELS[yMetric] || yMetric} (${axisDirection(yMetric)})`} stroke={axisStyle.stroke} fontSize={axisStyle.fontSize} />
        <ZAxis range={[80, 180]} />
        <RTooltip contentStyle={tooltipStyle} formatter={numericTooltip} labelFormatter={() => ""} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {graph === "pareto_plot" ? <>
          <Scatter name="Globally Pareto-optimal" data={plottedData.filter((row) => row.isPareto)} fill="#0f766e" />
          <Scatter name="Dominated across selected objectives" data={plottedData.filter((row) => !row.isPareto)} fill="#cbd5e1" />
        </> : <Scatter name="Combinations" data={plottedData} fill="#0f766e" />}
      </ScatterChart>,
      axisControls,
      plottedData.length ? null : "No combinations have finite values for both selected axes; this can happen when a group fairness metric has insufficient support in a validation fold.",
    );
  }

  if (graph === "fairness_gaps") {
    if (!fairnessMetrics.length) return null;
    return card(
      <BarChart data={fairnessData} margin={{ top: 15, right: 10, bottom: 55, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={65} {...axisStyle} />
        <YAxis {...axisStyle} />
        <RTooltip contentStyle={tooltipStyle} formatter={numericTooltip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {fairnessMetrics.map((name, index) => <Bar key={name} dataKey={name} name={METRIC_LABELS[name] || name} fill={index ? "#0f766e" : "#c2410c"} />)}
      </BarChart>,
    );
  }

  if (graph === "runtime") {
    return card(
      <BarChart data={chartData} margin={{ top: 15, right: 10, bottom: 55, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={65} {...axisStyle} />
        <YAxis name="Seconds" unit="s" {...axisStyle} />
        <RTooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(3)} s`, "Evaluation time"]} />
        <Bar dataKey="runtime_seconds" name="Evaluation time" fill="#0f766e" />
      </BarChart>,
    );
  }

  if (graph === "metric_comparison" || graph === "metric_stability") {
    if (!metric) return null;
    const metricData = chartData.map((row) => ({
      ...row,
      value: row.metrics[metric],
      std: row.metric_std[metric] || 0,
    }));
    return card(
      <BarChart data={metricData} margin={{ top: 15, right: 10, bottom: 55, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={65} {...axisStyle} />
        <YAxis {...axisStyle} />
        <RTooltip contentStyle={tooltipStyle} formatter={numericTooltip} />
        <Bar dataKey="value" name={METRIC_LABELS[metric] || metric} fill="#0f766e">
          {chartData.map((row, index) => <Cell key={row.id} fill={row.isBest ? "#0f172a" : "#0f766e"} opacity={row.isBest ? 1 : 0.8} />)}
          {graph === "metric_stability" && <ErrorBar dataKey="std" width={5} strokeWidth={1.5} stroke="#334155" />}
        </Bar>
      </BarChart>,
    );
  }

  return card(
    <BarChart data={chartData} margin={{ top: 15, right: 10, bottom: 55, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={65} {...axisStyle} />
      <YAxis domain={[0, 1]} {...axisStyle} />
      <RTooltip contentStyle={tooltipStyle} formatter={numericTooltip} />
      <Bar dataKey="score" name="Trade-off score" radius={[4, 4, 0, 0]}>
        {chartData.map((row) => <Cell key={row.id} fill={row.isBest ? "#0f172a" : "#0f766e"} opacity={row.isBest ? 1 : 0.75} />)}
      </Bar>
    </BarChart>,
  );
}

function SortHead({ label, col, sortBy, onClick, align = "left", isFairness = false }) {
  const active = sortBy.col === col;
  return (
    <TableHead
      className={`cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider whitespace-nowrap ${align === "right" ? "text-right" : ""} ${isFairness ? "text-teal-700" : "text-slate-600"}`}
      onClick={() => onClick(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label} <ArrowUpDown className={`w-3 h-3 ${active ? "text-slate-900" : "text-slate-300"}`} strokeWidth={1.5} />
      </span>
    </TableHead>
  );
}

function short(s) {
  return s.length > 18 ? s.slice(0, 16) + "…" : s;
}
