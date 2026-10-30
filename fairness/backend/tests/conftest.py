import pytest
import requests
import os


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def base_url():
    return BASE_URL


@pytest.fixture
def sample_config():
    """A valid classification experiment config for testing."""
    return {
        "name": "TEST_pytest_experiment",
        "dataset": {
            "source": "builtin",
            "name": "Adult Income",
            "label_column": "income",
            "positive_label": ">50K",
            "sensitive_attrs": ["sex", "race"],
            "columns": ["age", "sex", "race", "income", "hours-per-week"],
        },
        "scaler": "StandardScaler",
        "task_type": "classification",
        "models": ["Logistic Regression", "Random Forest Classifier", "MLP Classifier"],
        "fairness_enabled": True,
        "fairness_methods": ["No Method", "Reweighing", "DIR"],
        "bias_scope": "group",
        "group_treatment": "equally",
        "fairness_metrics": [
            {"name": "Equalized Odds Difference", "weight": 1.0},
            {"name": "Statistical Parity Difference", "weight": 1.0},
        ],
        "effectiveness_metrics": [
            {"name": "Accuracy", "weight": 1.0},
            {"name": "F1", "weight": 1.0},
        ],
        "tradeoff": {"strategy": "aggregation", "aggregation": "mean"},
        "validation": {"method": "train_test", "split": 80, "k": 5},
    }
