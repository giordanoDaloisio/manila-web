import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/context/WizardContext";
import StepIndicator from "@/components/wizard/StepIndicator";
import Step1Dataset from "@/components/wizard/Step1Dataset";
import Step2Scaler from "@/components/wizard/Step2Scaler";
import Step3Model from "@/components/wizard/Step3Model";
import Step4Fairness from "@/components/wizard/Step4Fairness";
import Step5Metrics from "@/components/wizard/Step5Metrics";
import Step6Tradeoff from "@/components/wizard/Step6Tradeoff";
import Step7Graphs from "@/components/wizard/Step7Graphs";
import Step8Review from "@/components/wizard/Step8Review";
import RunDialog from "@/components/wizard/RunDialog";
import ScriptDialog from "@/components/wizard/ScriptDialog";
import { getExperimentStatus, runExperiment } from "@/lib/api";
import { generateScript } from "@/lib/fairbench";

const TOTAL_STEPS = 8;

function validateStep(step, s) {
  switch (step) {
    case 1:
      if (!s.dataset.name) return "Pick a dataset (built-in or upload).";
      if (!s.dataset.label_column) return "Select the label column.";
      if (s.task_type === "classification" && s.dataset.profile?.n_classes === 2 && s.fairness_enabled && !s.dataset.positive_label) return "Enter the positive label value used for binary fairness metrics.";
      if (s.task_type === "classification" && s.fairness_enabled && !s.dataset.sensitive_attrs.length) return "Select at least one sensitive attribute.";
      return null;
    case 2:
      if (!s.scaler) return "Select a scaler (or None).";
      return null;
    case 3:
      if (!s.models.length) return "Select at least one model.";
      return null;
    case 4:
      if (s.fairness_enabled && !s.fairness_methods.length) return "Select at least one fairness method or turn the toggle off.";
      return null;
    case 5:
      if (!s.effectiveness_metrics.length) return "Select at least one effectiveness metric.";
      if (s.fairness_enabled && s.fairness_metrics.length === 0 && s.bias_scope) return "Select at least one fairness metric.";
      return null;
    case 6:
      if (s.tradeoff.strategy === "aggregation" && !s.tradeoff.aggregation) return "Pick an aggregation function.";
      if (s.tradeoff.strategy === "primary_metric") {
        const selected = [...s.effectiveness_metrics, ...(s.fairness_enabled ? s.fairness_metrics : [])].map((metric) => metric.name);
        if (!selected.includes(s.tradeoff.primary_metric)) return "Choose a primary metric from the metrics selected in Step 5.";
      }
      return null;
    case 7:
      if (!s.graph_options?.length) return "Select at least one result chart.";
      if (s.graph_options.some((graph) => ["metric_scatter", "pareto_plot"].includes(graph))) {
        const metrics = [...s.effectiveness_metrics, ...(s.fairness_enabled ? s.fairness_metrics : [])].map((metric) => metric.name);
        if (metrics.length < 2) return "Choose at least two effectiveness or fairness metrics for the selected scatter/Pareto chart.";
        for (const graph of ["metric_scatter", "pareto_plot"]) {
          if (!s.graph_options.includes(graph)) continue;
          const axes = s.graph_axes?.[graph] || {};
          if (!metrics.includes(axes.x) || !metrics.includes(axes.y) || axes.x === axes.y) return `Choose two different selected metrics for the ${graph === "pareto_plot" ? "Pareto" : "scatter"} chart axes.`;
        }
      }
      return null;
    case 8:
      if (s.validation.method === "stratified_kfold" && s.task_type !== "classification") return "Stratified K-Fold is only defined for classification targets; choose K-Fold or Train / Test for regression.";
      if (s.task_type === "classification") {
        const counts = s.dataset.profile?.class_counts || [];
        const smallestClass = counts.length ? Math.min(...counts.map((item) => item.count)) : 0;
        if (s.validation.method !== "train_test" && smallestClass < s.validation.k) return `The smallest target class has ${smallestClass} rows; ${s.validation.k}-fold validation needs at least ${s.validation.k} rows per class.`;
        if (s.validation.method === "train_test") {
          const usableRows = Math.max(0, (s.dataset.profile?.n_rows || 0) - (s.dataset.profile?.target_missing_rows || 0));
          const testRows = Math.ceil(usableRows * (1 - (s.validation.split || 80) / 100));
          if (smallestClass < 2 || Math.min(testRows, usableRows - testRows) < counts.length) return "The selected split cannot represent every target class in both partitions. Adjust the split or add minority-class examples.";
        }
      } else {
        const finiteRows = s.dataset.profile?.finite_target_rows ?? s.dataset.profile?.n_rows ?? 0;
        if (s.validation.method === "train_test" && finiteRows < 2) return "At least two rows with finite target values are required for a train/test split.";
        if (s.validation.method !== "train_test" && finiteRows < s.validation.k) return `At least ${s.validation.k} rows with finite target values are required for ${s.validation.k}-fold validation.`;
      }
      if (!s.name.trim()) return "Give your experiment a name.";
      return null;
    default:
      return null;
  }
}

export default function WizardPage() {
  const { state, update } = useWizard();
  const [step, setStep] = useState(1);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [runStage, setRunStage] = useState("idle");
  const [runProgress, setRunProgress] = useState(0);
  const navigate = useNavigate();

  const setProgress = (v) => setRunProgress(v);

  const goto = (n) => {
    // Allow jumping to any completed step or the current one
    if (n <= step) setStep(n);
  };
  const next = () => {
    const err = validateStep(step, state);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const runOnServer = async () => {
    const err = validateStep(8, state);
    if (err) { toast.error(err); return; }
    setRunOpen(true);
    setRunStage("queued");
    setProgress(0);

    try {
      const cfg = buildConfigForApi(state);
      const job = await runExperiment(cfg);
      if (!job?.id) throw new Error("The API did not return an experiment ID.");
      let complete = false;
      while (!complete) {
        const status = await getExperimentStatus(job.id);
        setProgress(status.progress || 0);
        if (status.status === "FAILURE") throw new Error(status.error || "The experiment worker failed.");
        if (status.status === "SUCCESS") {
          complete = true;
          break;
        }
        setRunStage(status.status === "PENDING" ? "queued" : (status.progress >= 85 ? "computing" : "running"));
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      setRunStage("done");
      setProgress(100);
      await new Promise((r) => setTimeout(r, 700));
      setRunOpen(false);
      navigate(`/experiments/${job.id}`);
    } catch (e) {
      setRunOpen(false);
      toast.error("Experiment failed: " + (e?.response?.data?.detail || e.message));
    }
  };

  return (
    <div className="animate-fade-in" data-testid="wizard-page">
      <div className="mb-6">
        <button onClick={() => navigate("/")} className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 transition-colors" data-testid="back-to-dashboard">
          ← Back to Experiments
        </button>
      </div>

      <StepIndicator current={step} onJump={goto} />

      <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-10 shadow-sm">
        {step === 1 && <Step1Dataset />}
        {step === 2 && <Step2Scaler />}
        {step === 3 && <Step3Model />}
        {step === 4 && <Step4Fairness />}
        {step === 5 && <Step5Metrics />}
        {step === 6 && <Step6Tradeoff />}
        {step === 7 && <Step7Graphs />}
        {step === 8 && (
          <Step8Review
            onEdit={setStep}
            onShowScript={() => setScriptOpen(true)}
            onDownloadScript={() => downloadConfigScript(state)}
            onRun={runOnServer}
          />
        )}
      </div>

      {step < 8 && (
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            data-testid="wizard-back-btn"
            onClick={back}
            disabled={step === 1}
            className="border-slate-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            data-testid="wizard-next-btn"
            onClick={next}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
      {step === 8 && (
        <div className="flex items-center justify-start mt-8">
          <Button variant="outline" data-testid="wizard-back-btn" onClick={back} className="border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      )}

      <ScriptDialog open={scriptOpen} onOpenChange={setScriptOpen} config={state} />
      <RunDialog open={runOpen} stage={runStage} progress={runProgress} />
    </div>
  );
}

function buildConfigForApi(s) {
  return {
    name: s.name,
    dataset: {
      source: s.dataset.source,
      name: s.dataset.name,
      dataset_id: s.dataset.dataset_id || null,
      label_column: s.dataset.label_column,
      positive_label: s.dataset.positive_label,
      sensitive_attrs: s.dataset.sensitive_attrs,
      columns: s.dataset.columns,
    },
    scaler: s.scaler,
    task_type: s.task_type,
    models: s.models,
    fairness_enabled: s.task_type === "classification" && s.fairness_enabled,
    fairness_methods: s.task_type === "classification" && s.fairness_enabled ? s.fairness_methods : [],
    bias_scope: s.bias_scope,
    group_treatment: s.group_treatment,
    fairness_metrics: s.task_type === "classification" && s.fairness_enabled ? s.fairness_metrics : [],
    effectiveness_metrics: s.effectiveness_metrics,
    tradeoff: s.tradeoff,
    graph_options: s.graph_options,
    graph_axes: s.graph_axes,
    validation: s.validation,
  };
}

function downloadConfigScript(config) {
  const blob = new Blob([generateScript(config)], { type: "text/x-python;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(config.name || "manila-experiment").trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "manila-experiment"}.py`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Runnable experiment script downloaded");
}
