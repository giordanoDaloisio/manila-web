import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FlaskConical, Trash2, ArrowUpRight, Clock, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listExperiments, deleteExperiment } from "@/lib/api";
import { useWizard } from "@/context/WizardContext";
import { toast } from "sonner";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { reset } = useWizard();

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await listExperiments();
        if (active) setExperiments(data);
      } catch {
        if (active) toast.error("Failed to load experiments");
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const startNew = () => { reset(); navigate("/new"); };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteExperiment(id);
      toast.success("Experiment deleted");
      const data = await listExperiments();
      setExperiments(data);
    } catch {
      toast.error("Failed to delete experiment");
    }
  };

  return (
    <div className="animate-fade-in" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500 mb-3">
            Experiments · Overview
          </div>
          <h1 className="text-4xl md:text-5xl font-sans font-bold tracking-tight text-slate-900">
            Fairness benchmarks,<br /> without writing code.
          </h1>
          <p className="mt-4 text-slate-600 max-w-2xl leading-relaxed">
            Configure model and fairness method combinations through a guided wizard, run them, and inspect the trade off between accuracy and fairness, all from a single dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {experiments.length >= 2 && (
            <Button
              data-testid="compare-btn"
              onClick={() => navigate("/compare")}
              variant="outline"
              size="lg"
              className="border-slate-300 h-12 px-5 rounded-md"
            >
              <GitCompareArrows className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Compare
            </Button>
          )}
          <Button
            data-testid="new-experiment-btn"
            onClick={startNew}
            size="lg"
            className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-md"
          >
            <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
            New Experiment
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {loading ? "Loading…" : `${experiments.length} experiment${experiments.length === 1 ? "" : "s"}`}
        </div>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {!loading && experiments.length === 0 && (
        <Card className="p-12 text-center border-dashed border-slate-300 bg-white" data-testid="empty-state">
          <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-5">
            <FlaskConical className="w-6 h-6 text-slate-500" strokeWidth={1.5} />
          </div>
          <h3 className="font-sans text-xl font-semibold text-slate-900 mb-2">
            No experiments yet
          </h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            Create your first fairness benchmark. Pick a dataset, choose models &amp; fairness methods, and see which combination wins.
          </p>
          <Button data-testid="empty-state-new-btn" onClick={startNew} className="bg-slate-900 hover:bg-slate-800 text-white">
            <Plus className="w-4 h-4 mr-2" /> Create your first experiment
          </Button>
        </Card>
      )}

      {!loading && experiments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="experiments-grid">
          {experiments.map((exp) => (
            <Card
              key={exp.id}
              data-testid={`experiment-card-${exp.id}`}
              onClick={() => navigate(`/experiments/${exp.id}`)}
              className="group cursor-pointer p-6 border border-slate-200 hover:border-slate-900 transition-all bg-white hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${
                  exp.task_type === "classification"
                    ? "border-teal-200 text-teal-700 bg-teal-50"
                    : "border-blue-200 text-blue-700 bg-blue-50"
                }`}>
                  {exp.task_type}
                </Badge>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans text-lg font-semibold text-slate-900 mb-1 line-clamp-2">
                {exp.name}
              </h3>
              <p className="text-sm text-slate-500 mb-5">{exp.dataset_name}</p>
              {exp.status !== "SUCCESS" && (
                <p className={`mb-4 text-xs font-mono uppercase tracking-wider ${exp.status === "FAILURE" ? "text-red-700" : "text-teal-700"}`}>
                  {exp.status === "FAILURE" ? "Failed" : `${exp.status === "PENDING" ? "Queued" : "Running"} · ${exp.progress || 0}%`}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Models</div>
                  <div className="font-mono text-lg text-slate-900">{exp.model_count}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Methods</div>
                  <div className="font-mono text-lg text-slate-900">{exp.method_count || 1}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Combos</div>
                  <div className="font-mono text-lg text-slate-900">{exp.combo_count}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  <span>{timeAgo(exp.created_at)}</span>
                </div>
                {(!exp.status || exp.status === "SUCCESS" || exp.status === "FAILURE") && <button
                  data-testid={`delete-experiment-${exp.id}`}
                  onClick={(e) => handleDelete(exp.id, e)}
                  className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
