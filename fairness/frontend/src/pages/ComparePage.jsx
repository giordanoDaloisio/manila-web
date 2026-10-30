import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { listExperiments, getExperiment } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, Legend,
} from "recharts";
import { toast } from "sonner";
import { ArrowLeft, GitCompareArrows, Award, Sparkles } from "lucide-react";

const COLOR_A = "#0f766e"; // teal-700
const COLOR_B = "#1d4ed8"; // blue-700

export default function ComparePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [experiments, setExperiments] = useState([]);
  const [expA, setExpA] = useState(null);
  const [expB, setExpB] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await listExperiments();
        setExperiments(list);
        const aId = params.get("a") || list[0]?.id;
        const bId = params.get("b") || list[1]?.id;
        if (aId) loadExp(aId, "a");
        if (bId) loadExp(bId, "b");
      } catch {
        toast.error("Failed to load experiments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadExp = async (id, slot) => {
    if (!id) return;
    try {
      const exp = await getExperiment(id);
      if (slot === "a") { setExpA(exp); setParams((p) => { const np = new URLSearchParams(p); np.set("a", id); return np; }); }
      else { setExpB(exp); setParams((p) => { const np = new URLSearchParams(p); np.set("b", id); return np; }); }
    } catch {
      toast.error("Could not load experiment");
    }
  };

  const chartData = useMemo(() => {
    if (!expA || !expB) return [];
    // Build joined rows keyed by "model + method"
    const map = new Map();
    (expA.results.combinations || []).forEach((c) => {
      const k = `${short(c.model)} · ${short(c.fairness_method)}`;
      map.set(k, { name: k, a: c.tradeoff_score });
    });
    (expB.results.combinations || []).forEach((c) => {
      const k = `${short(c.model)} · ${short(c.fairness_method)}`;
      const existing = map.get(k) || { name: k, a: null };
      existing.b = c.tradeoff_score;
      map.set(k, existing);
    });
    return Array.from(map.values());
  }, [expA, expB]);

  const bestA = expA?.results.combinations.find((c) => c.id === expA.results.best_id);
  const bestB = expB?.results.combinations.find((c) => c.id === expB.results.best_id);

  const allMetricNames = useMemo(() => {
    const names = new Set();
    [expA, expB].forEach((exp) => {
      if (!exp) return;
      exp.config.effectiveness_metrics.forEach((m) => names.add(m.name));
      exp.config.fairness_metrics.forEach((m) => names.add(m.name));
    });
    return Array.from(names);
  }, [expA, expB]);

  return (
    <div className="animate-fade-in" data-testid="compare-page">
      <Link to="/" data-testid="back-to-dashboard" className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="w-3 h-3" /> Back to experiments
      </Link>

      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-2">Compare mode</div>
        <h1 className="font-sans text-4xl font-bold text-slate-900 flex items-center gap-3">
          <GitCompareArrows className="w-8 h-8 text-slate-700" strokeWidth={1.5} />
          Overlay two experiments
        </h1>
        <p className="text-slate-600 mt-3 max-w-2xl">
          Compare configuration and results across two saved experiments — useful to see how changing a scaler, model, or fairness method shifts the trade-off frontier.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ExperimentPicker
          label="Experiment A"
          color={COLOR_A}
          slot="a"
          experiments={experiments}
          value={expA?.id || ""}
          onChange={(id) => loadExp(id, "a")}
          exp={expA}
          best={bestA}
        />
        <ExperimentPicker
          label="Experiment B"
          color={COLOR_B}
          slot="b"
          experiments={experiments}
          value={expB?.id || ""}
          onChange={(id) => loadExp(id, "b")}
          exp={expB}
          best={bestB}
        />
      </div>

      {expA && expB && chartData.length > 0 && (
        <Card className="p-6 md:p-8 bg-white border-slate-200 mb-6" data-testid="compare-chart-card">
          <div className="mb-5">
            <h3 className="font-sans text-lg font-semibold text-slate-900">Trade-off scores side-by-side</h3>
            <p className="text-xs text-slate-500 mt-1">
              Combinations shared between both experiments will show two bars; otherwise the missing slot is blank.
            </p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 70, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} stroke="#64748b" fontSize={10} height={80} />
                <YAxis domain={[0, 1]} stroke="#64748b" fontSize={11} />
                <RTooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} formatter={(v) => (typeof v === "number" ? v.toFixed(3) : "—")} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={expA.name} dataKey="a" fill={COLOR_A} radius={[4, 4, 0, 0]} />
                <Bar name={expB.name} dataKey="b" fill={COLOR_B} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {expA && expB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <BestCard exp={expA} best={bestA} color={COLOR_A} label="A" />
          <BestCard exp={expB} best={bestB} color={COLOR_B} label="B" />
        </div>
      )}

      {expA && expB && (
        <Card className="border-slate-200 bg-white overflow-hidden" data-testid="compare-table-card">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-sans text-lg font-semibold text-slate-900">All combinations · both experiments</h3>
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_A }} /> A · {expA.name}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_B }} /> B · {expB.name}</span>
            </div>
          </div>
          <div className="overflow-x-auto code-scroll">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Exp</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Model</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Fairness method</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider text-right text-slate-600">Trade-off</TableHead>
                  {allMetricNames.map((n) => (
                    <TableHead key={n} className="font-mono text-[10px] uppercase tracking-wider text-right text-slate-600 whitespace-nowrap">{n}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderRows(expA, "A", COLOR_A, allMetricNames)}
                {renderRows(expB, "B", COLOR_B, allMetricNames)}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!loading && experiments.length < 2 && (
        <Card className="p-8 text-center border-dashed border-slate-300 bg-white">
          <p className="text-slate-600">
            You need at least two saved experiments to use compare mode.
          </p>
        </Card>
      )}
    </div>
  );
}

function renderRows(exp, letter, color, metricNames) {
  return exp.results.combinations.map((c) => {
    const isBest = c.id === exp.results.best_id;
    return (
      <TableRow key={`${letter}-${c.id}`} data-testid={`compare-row-${letter}-${c.id}`} className={isBest ? "bg-slate-900/[0.03]" : ""}>
        <TableCell><Badge className="font-mono text-[10px] uppercase" style={{ background: color, color: "white" }}>{letter}</Badge></TableCell>
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
  });
}

function ExperimentPicker({ label, color, slot, experiments, value, onChange, exp, best }) {
  return (
    <Card className="p-5 border-slate-200 bg-white" data-testid={`picker-${slot}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={`picker-select-${slot}`} className="w-full">
          <SelectValue placeholder="Choose an experiment…" />
        </SelectTrigger>
        <SelectContent>
          {experiments.map((e) => (
            <SelectItem key={e.id} value={e.id} data-testid={`picker-option-${slot}-${e.id}`}>
              {e.name} · {e.dataset_name} · {e.combo_count} combos
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {exp && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-slate-900 font-medium truncate">{exp.name}</div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">{exp.config.dataset.name}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">{exp.config.task_type}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">{exp.config.scaler}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">{exp.results.combinations.length} combos</span>
          </div>
          {best && (
            <div className="text-xs text-slate-600 mt-2 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} strokeWidth={1.5} />
              <span>Best: <span className="font-medium text-slate-900">{best.model}</span> + <span className="font-mono">{best.fairness_method}</span> · score {best.tradeoff_score.toFixed(3)}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function BestCard({ exp, best, color, label }) {
  if (!best) return null;
  const topMetrics = Object.entries(best.metrics).slice(0, 3);
  return (
    <Card className="p-5 bg-white border-l-4 border-slate-200" style={{ borderLeftColor: color }} data-testid={`best-card-${label}`}>
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-3.5 h-3.5" style={{ color }} strokeWidth={2} />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color }}>Winner · {label}</span>
      </div>
      <div className="font-sans text-lg font-semibold text-slate-900">{best.model}</div>
      <div className="text-sm text-slate-600 mb-3">+ <span className="font-mono text-slate-800">{best.fairness_method}</span></div>
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded bg-slate-50 border border-slate-200">
          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Score</div>
          <div className="font-mono text-lg text-slate-900">{best.tradeoff_score.toFixed(3)}</div>
        </div>
        {topMetrics.map(([k, v]) => (
          <div key={k} className="p-2 rounded bg-slate-50 border border-slate-200">
            <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500 truncate">{k}</div>
            <div className="font-mono text-lg text-slate-900">{typeof v === "number" ? v.toFixed(3) : v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function short(s) {
  return s.length > 18 ? s.slice(0, 16) + "…" : s;
}
