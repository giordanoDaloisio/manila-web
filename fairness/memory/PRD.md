# FairBench — Product Requirements Document

## Original Problem Statement
Build "FairBench", a web-based low-code app that lets a data scientist configure a machine-learning fairness benchmarking experiment through a guided 7-step wizard, run it (simulated), and see a comparison of which model × fairness-method combination gives the best fairness / accuracy trade-off. Demo prototype for a university research supervisor — ML training is mocked with realistic random metrics, but every other UI/UX element is fully functional.

## User Personas
- **Data Scientist / ML Researcher** — configures and inspects fairness benchmarks without writing code.
- **Research Supervisor (evaluator)** — reviews saved experiments and inspects best combinations, metrics, and trade-off explanations.

## Core Requirements (static)
- 7-step guided wizard with a visible step indicator, progress bar, and per-step "Edit" jump.
- Constraint-driven UI: incompatible options are visibly disabled with a hover tooltip explaining why (Reweighing ⇢ MLP, Regression ⇢ Fairness methods).
- Two-tone color coding — Teal for fairness, Blue for effectiveness — consistent across metrics, charts and tables.
- Simulated staged run (Queued → Running → Computing metrics → Done) with polling-style progress.
- Persisted experiments (MongoDB) surfaced in a dashboard grid with delete + navigation to detail.
- Results dashboard: best-combination card, bar chart or Pareto scatter, sortable metrics table, mock CSV/`.dill` exports.
- Zero-auth prototype.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) — `/api/experiments/run` mock-generates realistic metrics (accuracy/fairness gaps), computes weighted / mean / harmonic-mean aggregation or Pareto front, persists to `experiments` collection. Endpoints: run, list, get, delete.
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts. Wizard state kept in a top-level `WizardContext`. Chivo (headers) / Work Sans (body) / JetBrains Mono (data & code) via Google Fonts.

## What's Been Implemented (2026-02)
- Dashboard with empty state + experiments grid (delete + click-through) + Compare button (>=2 experiments)
- 7-step wizard: dataset (3 built-ins + **real CSV upload with pandas parsing**), scaler, task+models, fairness methods (grouped), guided metrics with weights, aggregation/pareto strategy, review + script preview + run
- Simulated staged run dialog (~7s) with 4 phases
- Results page: best-trade-off card, bar chart (or Pareto scatter), sortable metrics table, mock CSV/`.dill` exports, Compare-with-this-experiment shortcut, **Print report button (browser print) + @media print CSS for supervisor handout**
- **REAL ML training** (2026-02): backend uses scikit-learn + fairlearn to train the selected models on small (synthetic bias-embedded) datasets or user-uploaded CSVs, computes real fairness metrics. Mitigation methods: Reweighing, DIR, DEMV, Exponentiated Gradient, Calibrated Equalized Odds. All silent fallback paths (fairlearn exceptions, sample_weight incompatibility, mitigator failure, server-side metric backfill) now emit `logger.warning` messages for transparency during demos.
- **Compare mode** (2026-02): `/compare` page overlays two saved experiments side-by-side.
- **Real CSV upload** (2026-02): new `POST /api/datasets/upload` endpoint parses uploaded CSVs with pandas (nrows capped at 5000), stores rows in `db.uploaded_datasets`, returns dataset_id + real columns + preview. Wizard Step 1 uploads via multipart, shows a spinner, populates the label-column dropdown with real headers, and passes dataset_id through to the training run.
- Testing agent: 100% pass on all three iterations (backend 17 pytest cases, full frontend Playwright walkthrough incl. print-media emulation).

## Backlog / P0 / P1 / P2

### P1
- Real CSV parsing for uploaded datasets (currently generates fake preview)
- Additional individual-fairness metrics beyond Consistency
- Compare mode: overlay multiple experiments side-by-side

### P2
- Pagination on `/api/experiments` beyond 500 rows
- Per-user filtering (once auth is added)
- Real trained model artifact download (`.dill` currently mocked)
- Dark theme variant of the notebook-hybrid aesthetic

## Next Actions
- Ship prototype to supervisor for demo
- Gather feedback on constraint logic clarity + Pareto interpretation
- Decide whether to swap mock training with a lightweight real scikit-learn/aif360 pipeline for the strongest demo
