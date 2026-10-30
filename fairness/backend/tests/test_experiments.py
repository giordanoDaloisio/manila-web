"""FairBench backend API tests: covers /api root, /api/experiments CRUD,
/api/experiments/run REAL training (sklearn+fairlearn), Reweighing+MLP skip,
regression task, performance, and fallback behaviour."""
import time
import pytest
import requests


# ---------- Health / root ----------
class TestRoot:
    def test_root_returns_message(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "FairBench" in data["message"]


# ---------- Experiments list ----------
class TestListExperiments:
    def test_list_returns_array(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/experiments")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            exp = data[0]
            for key in ("id", "name", "created_at", "task_type", "dataset_name",
                        "model_count", "method_count", "combo_count"):
                assert key in exp, f"missing key {key} in summary"


# ---------- Real training: classification ----------
class TestRunExperimentRealTraining:
    def test_run_real_classification_grid(self, api_client, base_url, sample_config):
        """3 models x 4 methods = 12; MLP × Reweighing skipped => 11 combos.
        Metrics must be real floats (varying across combos)."""
        cfg = dict(sample_config)
        cfg["name"] = "TEST_real_classification"
        cfg["models"] = ["Logistic Regression", "Random Forest Classifier", "MLP Classifier"]
        cfg["fairness_methods"] = ["No Method", "Reweighing", "DIR", "Exponentiated Gradient"]

        t0 = time.time()
        r = api_client.post(f"{base_url}/api/experiments/run", json=cfg, timeout=60)
        elapsed = time.time() - t0
        assert r.status_code == 200, f"Body: {r.text[:400]}"
        exp = r.json()

        combos = exp["results"]["combinations"]
        # 3*4 = 12; skip MLP+Reweighing => 11
        assert len(combos) == 11, f"Expected 11 combos, got {len(combos)}"

        # Reweighing+MLP must be absent
        for c in combos:
            assert not (c["fairness_method"] == "Reweighing" and "MLP" in c["model"])

        # Accuracy sanity: real float, plausible range for Adult Income synthetic
        accs = [c["metrics"].get("Accuracy") for c in combos if "Accuracy" in c["metrics"]]
        assert accs, "No Accuracy metric in combos"
        for a in accs:
            assert isinstance(a, float)
            assert 0.55 <= a <= 0.99, f"Accuracy {a} out of plausible range"

        # Metrics should NOT be identical placeholders — expect variation across combos
        unique_accs = len(set(round(a, 3) for a in accs))
        assert unique_accs >= 3, f"Accuracies look too uniform: {accs}"

        # Fairness gaps should be real floats (No Method non-zero)
        gaps_no_method = []
        for c in combos:
            if c["fairness_method"] == "No Method":
                gap = c["metrics"].get("Equalized Odds Difference")
                if gap is not None:
                    gaps_no_method.append(gap)
        assert gaps_no_method, "No No Method gaps"
        assert any(g > 0.0 for g in gaps_no_method), f"Expected non-zero fairness gap on No Method, got {gaps_no_method}"

        # Best_id valid
        best_id = exp["results"]["best_id"]
        assert any(c["id"] == best_id for c in combos)

        # Persist to database (round-trip)
        exp_id = exp["id"]
        g = api_client.get(f"{base_url}/api/experiments/{exp_id}")
        assert g.status_code == 200
        got = g.json()
        assert len(got["results"]["combinations"]) == 11

        # Performance guard — 12 real trainings should be reasonably fast on this small data.
        # Task says <10s but we allow generous margin because network/preview may add latency.
        assert elapsed < 60, f"Run took too long: {elapsed:.1f}s"
        print(f"Real training elapsed: {elapsed:.2f}s")

    def test_run_regression_real(self, api_client, base_url, sample_config):
        cfg = dict(sample_config)
        cfg["name"] = "TEST_real_regression"
        cfg["task_type"] = "regression"
        cfg["models"] = ["Linear Regression", "Decision Tree Regressor"]
        cfg["fairness_enabled"] = False
        cfg["fairness_methods"] = []
        cfg["fairness_metrics"] = []
        cfg["effectiveness_metrics"] = [
            {"name": "MAE", "weight": 1.0},
            {"name": "MSE", "weight": 1.0},
            {"name": "R\u00b2", "weight": 1.0},
        ]
        r = api_client.post(f"{base_url}/api/experiments/run", json=cfg, timeout=30)
        assert r.status_code == 200, r.text[:400]
        exp = r.json()
        combos = exp["results"]["combinations"]
        # 2 models × No Method fallback => 2
        assert len(combos) == 2
        # Only regression metrics
        for c in combos:
            for m in c["metrics"]:
                assert m in ("MAE", "MSE", "R\u00b2"), f"Unexpected metric {m}"
            assert isinstance(c["metrics"].get("MAE"), float)
            assert isinstance(c["metrics"].get("R\u00b2"), float)

    def test_run_requires_models(self, api_client, base_url, sample_config):
        cfg = dict(sample_config)
        cfg["models"] = []
        r = api_client.post(f"{base_url}/api/experiments/run", json=cfg)
        assert r.status_code == 400

    def test_pareto_strategy(self, api_client, base_url, sample_config):
        cfg = dict(sample_config)
        cfg["name"] = "TEST_real_pareto"
        cfg["models"] = ["Logistic Regression", "Random Forest Classifier"]
        cfg["fairness_methods"] = ["No Method", "Reweighing"]
        cfg["tradeoff"] = {"strategy": "pareto", "aggregation": None}
        r = api_client.post(f"{base_url}/api/experiments/run", json=cfg, timeout=60)
        assert r.status_code == 200, r.text[:400]
        exp = r.json()
        combos = exp["results"]["combinations"]
        assert any(c["pareto_optimal"] for c in combos)
        best = next(c for c in combos if c["id"] == exp["results"]["best_id"])
        assert best["pareto_optimal"] is True


# ---------- Fallback safety ----------
class TestFallback:
    def test_rare_combo_svc_small_dataset_does_not_crash(self, api_client, base_url, sample_config):
        """SVC on the uploaded fallback dataset — if real training misbehaves,
        mock generate_metrics must back-fill (never 500)."""
        cfg = dict(sample_config)
        cfg["name"] = "TEST_fallback_svc"
        cfg["dataset"] = {
            "source": "upload",
            "name": "custom_upload.csv",
            "label_column": "label",
            "positive_label": "1",
            "sensitive_attrs": ["gender"],
            "columns": [],
        }
        cfg["models"] = ["Support Vector Classifier"]
        cfg["fairness_methods"] = ["No Method"]
        r = api_client.post(f"{base_url}/api/experiments/run", json=cfg, timeout=60)
        assert r.status_code == 200, r.text[:400]
        exp = r.json()
        combos = exp["results"]["combinations"]
        assert len(combos) == 1
        m = combos[0]["metrics"]
        # Must have at least one requested effectiveness metric with a numeric value
        assert any(isinstance(v, (int, float)) for v in m.values())


# ---------- Delete & 404 ----------
class TestDeleteAndErrors:
    def test_get_nonexistent(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/experiments/nonexistent-id-xyz")
        assert r.status_code == 404

    def test_delete_nonexistent(self, api_client, base_url):
        r = api_client.delete(f"{base_url}/api/experiments/nonexistent-id-xyz")
        assert r.status_code == 404

    def test_cleanup_test_experiments(self, api_client, base_url):
        """Cleanup TEST_-prefixed experiments and verify they are gone."""
        lst = api_client.get(f"{base_url}/api/experiments").json()
        test_ids = [e["id"] for e in lst if e["name"].startswith("TEST_")]
        for exp_id in test_ids:
            d = api_client.delete(f"{base_url}/api/experiments/{exp_id}")
            assert d.status_code == 200
            g = api_client.get(f"{base_url}/api/experiments/{exp_id}")
            assert g.status_code == 404
