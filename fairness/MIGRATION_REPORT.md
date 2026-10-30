# Manila → Fairness feature migration

Folder A remains the application shell and wizard under `frontend/src`; Folder B (`Desktop/manila-clone`) supplies the training and analysis engine. The original Fairness mock metric fallback was removed from the run path. Experiment metrics now come from the integrated scikit-learn/Fairlearn engine.

## Feature map

| Manila functionality | Fairness integration | Status |
|---|---|---|
| Built-in datasets (Adult small, sensor regression, synthetic hiring) | Dataset choices in the existing wizard, backed by `backend/data/` | Integrated |
| CSV uploads and target-column selection | Uploads are saved under `backend/data/uploads/`; the wizard calls profiling again when the target changes | Integrated |
| Dataset profiling and compatible-model checks | `backend/dataset_profiler.py`, `backend/model_compatibility.py`; incompatible task/model choices are disabled | Integrated |
| Classification and regression models | Existing model-selection step now lists Manila’s supported model registry; training executes in the integrated engine | Integrated |
| Reweighing, Exponentiated Gradient (DP/EO/TPR), and Threshold Optimizer (EO/DP/TPR/FPR/FNR) | Existing fairness step, with compatibility checks against selected models and target | Integrated |
| Fold-safe preprocessing, categorical encoding, imputation, scalers | `backend/app/experiment_engine.py` | Integrated |
| Accuracy, balanced accuracy, F1, precision, recall, ROC-AUC, R², MAE; demographic parity and equalized odds gaps | Existing metric-selection and results table, using real fold-level values | Integrated |
| Train/test, K-fold, stratified K-fold, random seed | Existing validation/review step | Integrated |
| Mean normalized score, harmonic mean, 0–1 weighted sum, selected primary metric, Pareto selection | Trade-off step maps each metric to a direction-aware 0–1 utility and applies the chosen scoring rule in the experiment engine | Integrated |
| Saved experiment results and artifacts | Results persist under `backend/results/`; dashboard restores saved experiments after restart | Integrated |
| Celery task queue, RabbitMQ broker, Redis result store, and live job progress | FastAPI enqueues work; `backend/app/tasks.py` persists state and streams progress to the existing progress dialog and run history | Integrated |
| Selectable result graphs (score, metric scatter with editable x/y axes from selected effectiveness/fairness metrics, fairness gaps, runtime, metric comparison, metric stability, Pareto objectives) | Graph options and axis choices are validated, saved with the run, and rendered with raw metric values; Pareto membership uses direction-aware normalized values over all selected objectives | Integrated |
| Dataset and option recommendations with availability explanations | Recommendations use target type, class counts, selected protected attributes, and estimator capabilities; unavailable options state the unmet ML prerequisite | Integrated |
| Metrics CSV, fitted best model, reproduction script | Download controls on the results page; the pre-run review also downloads a Python script that calls the same validator and training engine | Integrated |
| Docker development stack and runtime configuration | `docker-compose.yml` runs CRA, FastAPI, Celery, RabbitMQ, and Redis; service Dockerfiles and `.env.example` are adapted to Folder A | Integrated |

## Main files

- Added the Manila profiler, compatibility registry, model registry, validator, evaluator, and experiment engine under `backend/`.
- Updated `backend/server.py` to validate and execute real experiments, persist datasets/results, expose dataset analysis and artifact downloads, and remove mocked metric fallback behavior.
- Updated `frontend/src/lib/fairbench.js`, wizard steps, API helpers, and result controls to present the migrated options within Fairness’s existing page hierarchy.
- Added the source built-in CSV assets in `backend/data/`; generated uploads and run artifacts are ignored by Git.

## Validation and known limits

- The API, Celery worker, RabbitMQ, Redis, and frontend images built successfully with Docker Compose. The React production build completed in the Node 22 container.
- A local API smoke run submitted a Logistic Regression experiment with two effectiveness metrics, two fairness metrics, and all seven chart options. The task completed with `SUCCESS`; the result endpoint returned one combination, its selected graph configuration, runtime, and fold standard deviations.
- That end-to-end run exposed a Celery prefork import-path issue in result persistence. `backend/app/tasks.py` now inserts the backend root before its lazy server import; the rerun passed.
- `python3 -m compileall` passed for the integrated backend modules, and `git diff --check` passed. The frontend build reports one existing hook-dependency warning in `frontend/src/pages/ComparePage.jsx`; it does not prevent compilation.
- Docker's `npm ci` reported 81 dependency audit findings in the existing lockfile (12 low, 37 moderate, 30 high, 2 critical). Dependencies were not upgraded as part of this migration.
- The local Python 3.14 environment does not have the project's runtime dependencies, so backend tests were not run there. The Docker backend uses Python 3.11 and installed the dependencies from `backend/requirements.txt`.

Recommendations are transparent rules of thumb, not trained predictors of model performance. The interface suggests baseline/comparison models and preprocessing/validation choices, surfaces class imbalance and support warnings, and leaves the choice of fairness criterion to the user because those criteria encode policy goals. The under-100-row message is a conservative interface caution, not a universal statistical adequacy threshold.
