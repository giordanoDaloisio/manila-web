"""Run a complete MANILA meeting demo without starting the API server."""
from __future__ import annotations

import json
from pathlib import Path

from training import (
    data_readiness_report,
    make_demo_hiring_dataset,
    recommend_metrics,
    tradeoff_score,
    train_combination,
)


def main() -> None:
    output_dir = Path(__file__).resolve().parent / "demo_output"
    output_dir.mkdir(exist_ok=True)

    df = make_demo_hiring_dataset()
    df.to_csv(output_dir / "synthetic_hiring_demo.csv", index=False)

    readiness = data_readiness_report(
        df,
        label_column="qualified",
        positive_label="1",
        sensitive_attrs=["gender", "region"],
    )
    recommendation = recommend_metrics(
        primary_harm="qualified_people_rejected",
        ground_truth_available=True,
        outcome_is_benefit=True,
    )

    weights = {
        "Accuracy": 1.0,
        "Recall": 1.2,
        "Equal Opportunity Difference": 1.5,
        "False Negative Rate Difference": 1.5,
    }
    combinations = []
    for model in ["Logistic Regression", "Random Forest Classifier"]:
        for method in ["No Method", "Reweighing"]:
            result = train_combination(
                df,
                label_column="qualified",
                positive_label="1",
                sensitive_attrs=["gender", "region"],
                scaler_name="StandardScaler",
                model_name=model,
                mitigation_method=method,
                effectiveness_metrics=["Accuracy", "Recall"],
                fairness_metrics=["Equal Opportunity Difference", "False Negative Rate Difference"],
                bootstrap_iterations=50,
            )
            combinations.append(
                {
                    "model": model,
                    "mitigation_method": method,
                    "tradeoff_score": tradeoff_score(result, weights),
                    "result": result,
                }
            )

    combinations.sort(key=lambda item: item["tradeoff_score"], reverse=True)
    report = {
        "disclosure": "Synthetic demonstration dataset; no metric values are mocked.",
        "data_readiness": readiness,
        "recommendation": recommendation,
        "ranked_combinations": combinations,
        "best_combination": {
            "model": combinations[0]["model"],
            "mitigation_method": combinations[0]["mitigation_method"],
            "tradeoff_score": combinations[0]["tradeoff_score"],
        },
    }
    report_path = output_dir / "meeting_demo_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\nMANILA REAL COMPUTATION DEMO")
    print("=" * 32)
    print(f"Rows: {len(df):,}")
    print(f"Ready: {readiness['ready']}")
    print(f"Rule: {recommendation['rule_id']}")
    print("Recommended metrics:", ", ".join(recommendation["recommended_metrics"]))
    print("\nRanked model/mitigation combinations:")
    for item in combinations:
        result = item["result"]
        print(
            f"- {item['model']} + {item['mitigation_method']}: "
            f"score={item['tradeoff_score']:.4f}, "
            f"accuracy={result['effectiveness_metrics']['Accuracy']:.4f}, "
            f"EO gap={result['fairness_metrics']['Equal Opportunity Difference']:.4f}"
        )
    print(f"\nDetailed auditable report: {report_path}")


if __name__ == "__main__":
    main()
