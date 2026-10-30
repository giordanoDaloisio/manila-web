import { Fragment } from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { n: 1, key: "dataset", title: "Dataset" },
  { n: 2, key: "scaler", title: "Scaler" },
  { n: 3, key: "model", title: "Model" },
  { n: 4, key: "fairness", title: "Fairness" },
  { n: 5, key: "metrics", title: "Metrics" },
  { n: 6, key: "tradeoff", title: "Trade-off" },
  { n: 7, key: "graphs", title: "Graphs" },
  { n: 8, key: "review", title: "Review" },
];

export default function StepIndicator({ current, onJump }) {
  const percent = ((current) / STEPS.length) * 100;
  return (
    <div className="mb-10" data-testid="step-indicator">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Step {current} of {STEPS.length} · {STEPS[current - 1].title}
        </div>
        <div className="font-mono text-[11px] text-slate-500">{Math.round(percent)}%</div>
      </div>
      <Progress value={percent} className="h-1.5 bg-slate-200" />

      <div className="mt-6 hidden md:flex items-center justify-between">
        {STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <button
              type="button"
              data-testid={`step-tab-${s.n}`}
              onClick={() => onJump?.(s.n)}
              className="flex flex-col items-center gap-2 group"
              disabled={!onJump}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-medium border-2 transition-all
                ${s.n < current ? "bg-slate-900 text-white border-slate-900" :
                  s.n === current ? "bg-white text-slate-900 border-slate-900" :
                  "bg-white text-slate-400 border-slate-200"}`}>
                {s.n < current ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : s.n}
              </div>
              <div className={`text-[11px] font-medium tracking-tight transition-colors
                ${s.n === current ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"}`}>
                {s.title}
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-6 ${s.n < current ? "bg-slate-900" : "bg-slate-200"}`} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export { STEPS };
