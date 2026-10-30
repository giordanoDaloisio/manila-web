# MANILA real-computation meeting demo

## What changed

1. Random/mock metrics were removed completely.
2. A failed algorithm now returns a visible failure instead of fabricated output.
3. Sensitive attributes are excluded from predictive features by default.
4. Multiple sensitive attributes are evaluated as intersectional groups.
5. Data readiness checks run before training.
6. Recommendations are produced by explicit versioned rules.
7. Group confusion matrices, disparity metrics and bootstrap confidence intervals are computed from actual predictions.
8. Every experiment stores its configuration, version and provenance in an audit record.
9. Uploaded datasets and experiments persist through SQLite and CSV storage rather than disappearing on every restart.
10. CORS is restricted through an environment variable.

## Fastest meeting demo

```bash
cd manila_meeting_backend
python demo.py
```

This creates:

- `demo_output/synthetic_hiring_demo.csv`
- `demo_output/meeting_demo_report.json`

The dataset is explicitly synthetic, but every performance and fairness number is computed by real models.

## API demo

```bash
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

Then:

1. `POST /api/v1/datasets/demo`
2. Copy the returned `dataset_id` into `demo_request.json`.
3. `POST /api/v1/datasets/readiness`
4. `POST /api/v1/recommendations`
5. `POST /api/v1/experiments/run`
6. Open `/docs` for the interactive FastAPI interface.

## Lines to say in the meeting

> The previous prototype could replace failed computations with random metric values. In this version, every number comes from an actual trained model. Failed combinations are reported honestly and never backfilled.

> Before training, MANILA validates the label, protected groups, missingness, class balance and subgroup sizes. After training, it reports group-level evidence, disparity metrics and bootstrap confidence intervals.

> The recommendation engine is transparent: it records the exact rule and version used, while the experiment audit stores the dataset configuration, model, mitigation method, random seed and platform version.

## Honest limitations

- This first implementation focuses on binary classification.
- Reweighing is fully implemented locally.
- Threshold Optimizer requires Fairlearn.
- SQLite/local CSV storage is suitable for a demonstrator, not a multi-tenant production deployment.
- Metric choice and model selection still require human review.
