import { Link, Outlet, useLocation } from "react-router-dom";
import { Scale } from "lucide-react";

export default function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" data-testid="app-shell">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" data-testid="brand-link" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center">
              <Scale className="w-4 h-4 text-teal-300" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-sans font-bold text-[15px] tracking-tight">MANILA</span>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.18em]">Fairness Benchmarking Lab</span>
            </div>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/"
              data-testid="nav-experiments"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/" ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Experiments
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10">
        <Outlet />
      </main>
    </div>
  );
}
