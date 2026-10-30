"""FairBench iteration 3 tests:
- POST /api/datasets/upload real CSV parsing
- Rejection of non-CSV & empty CSV
- Run experiment with source='upload' + dataset_id (real records used)
- Run with source='upload' but missing/invalid dataset_id -> 400
- Regression task + fairness metric name (Equalized Odds Diff) -> no crash, fallback
"""
import io
import time
import pytest


CSV_CONTENT = (
    "age,sex,race,income\n"
    "23,Male,White,high\n"
    "45,Female,Black,low\n"
    "31,Male,Asian,high\n"
    "52,Female,White,low\n"
    "27,Male,Black,high\n"
    "38,Female,Asian,low\n"
    "41,Male,White,high\n"
    "29,Female,Black,low\n"
    "35,Male,White,high\n"
    "48,Female,White,low\n"
    "22,Male,Asian,high\n"
    "56,Female,Black,low\n"
    "33,Male,White,high\n"
    "44,Female,White,low\n"
    "26,Male,Black,high\n"
    "51,Female,Asian,low\n"
    "37,Male,White,high\n"
    "43,Female,White,low\n"
    "28,Male,Asian,high\n"
    "39,Female,Black,low\n"
)


# ------------------ Upload endpoint ------------------
class TestUpload:
    def test_upload_csv_success(self, api_client, base_url):
        files = {"file": ("TEST_upload.csv", CSV_CONTENT, "text/csv")}
        # Remove JSON content-type header — requests will set multipart automatically
        session = api_client
        session.headers.pop("Content-Type", None)
        r = session.post(f"{base_url}/api/datasets/upload", files=files)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert "dataset_id" in data and isinstance(data["dataset_id"], str)
        assert data["name"] == "TEST_upload.csv"
        assert set(data["columns"]) == {"age", "sex", "race", "income"}
        assert data["row_count"] == 20
        assert isinstance(data["preview"], list)
        assert len(data["preview"]) == 5
        assert data["preview"][0]["age"] == 23
        # store id for downstream test via pytest cache
        session.headers.update({"Content-Type": "application/json"})

    def test_upload_rejects_non_csv(self, api_client, base_url):
        files = {"file": ("readme.txt", b"not a csv", "text/plain")}
        session = api_client
        session.headers.pop("Content-Type", None)
        r = session.post(f"{base_url}/api/datasets/upload", files=files)
        assert r.status_code == 400
        session.headers.update({"Content-Type": "application/json"})

    def test_upload_rejects_empty_csv(self, api_client, base_url):
        files = {"file": ("empty.csv", "", "text/csv")}
        session = api_client
        session.headers.pop("Content-Type", None)
        r = session.post(f"{base_url}/api/datasets/upload", files=files)
        # pandas raises EmptyDataError on empty stream -> 400
        assert r.status_code == 400
        session.headers.update({"Content-Type": "application/json"})


# ------------------ Run experiment on uploaded dataset ------------------
class TestRunOnUpload:
    def test_run_with_real_uploaded_csv(self, api_client, base_url):
        # 1. Upload
        session = api_client
        session.headers.pop("Content-Type", None)
        files = {"file": ("TEST_run_upload.csv", CSV_CONTENT, "text/csv")}
        r = session.post(f"{base_url}/api/datasets/upload", files=files)
        assert r.status_code == 200
        upload = r.json()
        session.headers.update({"Content-Type": "application/json"})

        # 2. Configure and run experiment referencing the uploaded dataset id
        cfg = {
            "name": "TEST_upload_run",
            "dataset": {
                "source": "upload",
                "name": upload["name"],
                "dataset_id": upload["dataset_id"],
                "label_column": "income",
                "positive_label": "high",
                "sensitive_attrs": ["sex"],
                "columns": upload["columns"],
            },
            "scaler": "StandardScaler",
            "task_type": "classification",
            "models": ["Logistic Regression"],
            "fairness_enabled": True,
            "fairness_methods": ["No Method"],
            "bias_scope": "group",
            "group_treatment": "equally",
            "fairness_metrics": [
                {"name": "Statistical Parity Difference", "weight": 1.0},
            ],
            "effectiveness_metrics": [
                {"name": "Accuracy", "weight": 1.0},
            ],
            "tradeoff": {"strategy": "aggregation", "aggregation": "mean"},
            "validation": {"method": "train_test", "split": 80, "k": 5},
        }
        t0 = time.time()
        r = session.post(f"{base_url}/api/experiments/run", json=cfg, timeout=60)
        elapsed = time.time() - t0
        assert r.status_code == 200, r.text[:400]
        exp = r.json()
        combos = exp["results"]["combinations"]
        assert len(combos) == 1
        m = combos[0]["metrics"]
        assert "Accuracy" in m and isinstance(m["Accuracy"], float)
        assert "Statistical Parity Difference" in m
        # Verify label & sensitive attrs were preserved (not defaulted to gender/label)
        got_ds = exp["config"]["dataset"]
        assert got_ds["label_column"] == "income"
        assert got_ds["sensitive_attrs"] == ["sex"]
        assert got_ds["source"] == "upload"
        assert got_ds["dataset_id"] == upload["dataset_id"]
        print(f"Upload+run elapsed: {elapsed:.2f}s")

    def test_run_with_upload_but_missing_dataset_id(self, api_client, base_url):
        cfg = {
            "name": "TEST_upload_no_id",
            "dataset": {
                "source": "upload",
                "name": "ghost.csv",
                "dataset_id": "does-not-exist-uuid-000",
                "label_column": "income",
                "positive_label": "high",
                "sensitive_attrs": ["sex"],
                "columns": [],
            },
            "scaler": "StandardScaler",
            "task_type": "classification",
            "models": ["Logistic Regression"],
            "fairness_enabled": False,
            "fairness_methods": [],
            "bias_scope": "group",
            "group_treatment": "equally",
            "fairness_metrics": [],
            "effectiveness_metrics": [{"name": "Accuracy", "weight": 1.0}],
            "tradeoff": {"strategy": "aggregation", "aggregation": "mean"},
            "validation": {"method": "train_test", "split": 80, "k": 5},
        }
        r = api_client.post(f"{base_url}/api/experiments/run", json=cfg, timeout=30)
        assert r.status_code == 400
        assert "not found" in r.text.lower() or "re-upload" in r.text.lower()


# ------------------ Regression + wrong fairness metric fallback ------------------
class TestRegressionFairnessFallback:
    def test_regression_with_classification_fairness_metric_does_not_crash(self, api_client, base_url, sample_config):
        cfg = dict(sample_config)
        cfg["name"] = "TEST_regression_bad_fairness"
        cfg["task_type"] = "regression"
        cfg["models"] = ["Linear Regression"]
        cfg["fairness_enabled"] = True
        cfg["fairness_methods"] = ["No Method"]
        cfg["fairness_metrics"] = [{"name": "Equalized Odds Difference", "weight": 1.0}]
        cfg["effectiveness_metrics"] = [{"name": "MAE", "weight": 1.0}]
        r = api_client.post(f"{base_url}/api/experiments/run", json=cfg, timeout=60)
        # Regression task should not crash even if a classification fairness metric is picked.
        assert r.status_code == 200, r.text[:400]
        exp = r.json()
        combos = exp["results"]["combinations"]
        assert len(combos) == 1
        m = combos[0]["metrics"]
        # Both requested metrics should be present (fallback fills the missing fairness metric)
        assert "MAE" in m
        assert "Equalized Odds Difference" in m
        assert isinstance(m["Equalized Odds Difference"], float)


# ------------------ Cleanup ------------------
class TestCleanup:
    def test_cleanup_test_experiments(self, api_client, base_url):
        lst = api_client.get(f"{base_url}/api/experiments").json()
        for e in lst:
            if e["name"].startswith("TEST_"):
                api_client.delete(f"{base_url}/api/experiments/{e['id']}")
