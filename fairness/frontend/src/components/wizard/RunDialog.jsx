import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

const STAGES = [
  { key: "queued", label: "Preparing", detail: "Validating the selected dataset and settings" },
  { key: "running", label: "Training models", detail: "Evaluating models across validation folds" },
  { key: "computing", label: "Computing metrics", detail: "Measuring fairness and effectiveness" },
  { key: "done", label: "Done", detail: "Wrapping up" },
];

function stageIndex(stage) {
  return STAGES.findIndex((s) => s.key === stage);
}

export default function RunDialog({ open, stage, progress }) {
  const idx = stageIndex(stage);
  return (
    <Dialog open={open}>
      <DialogContent data-testid="run-dialog" className="max-w-lg bg-white" showCloseButton={false}>
        <div className="pt-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-700 mb-2">
            Running experiment
          </div>
          <h3 className="font-sans text-2xl font-bold text-slate-900 mb-1">
            Benchmarking in progress…
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            The backend is fitting and evaluating real models with the selected data and validation settings.
          </p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {STAGES[Math.max(0, idx)]?.label || "Idle"}
              </div>
              <div className="font-mono text-sm text-slate-900">{Math.round(progress)}%</div>
            </div>
            <Progress value={progress} className="h-2" data-testid="run-progress" />
          </div>

          <div className="space-y-2">
            {STAGES.map((s, i) => {
              const active = i === idx;
              const done = i < idx || (i === idx && s.key === "done");
              return (
                <div
                  key={s.key}
                  data-testid={`run-stage-${s.key}`}
                  className={`flex items-center gap-3 p-3 rounded-md border ${
                    active ? "border-slate-900 bg-slate-50" : done ? "border-teal-200 bg-teal-50/40" : "border-slate-200 bg-white"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-700 flex-shrink-0" strokeWidth={1.75} />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 text-slate-900 flex-shrink-0 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" strokeWidth={1.5} />
                  )}
                  <div>
                    <div className={`text-sm font-medium ${done ? "text-teal-800" : active ? "text-slate-900" : "text-slate-500"}`}>{s.label}</div>
                    <div className="text-xs text-slate-500">{s.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
