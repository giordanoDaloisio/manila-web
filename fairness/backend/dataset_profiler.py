from dataclasses import asdict, dataclass

import pandas as pd


@dataclass
class DatasetProfile:
    n_rows: int
    n_features: int
    n_numeric_features: int
    n_categorical_features: int
    missing_value_ratio: float
    target_column: str | None
    task_type: str
    n_classes: int | None


def infer_task_type(series: pd.Series) -> tuple[str, int | None]:
    values = series.dropna()

    if values.empty:
        return "unknown", None

    unique_count = values.nunique()
    if unique_count < 2:
        return "unknown", unique_count

    if pd.api.types.is_numeric_dtype(values):
        # Low-cardinality integer targets are usually class labels; decimal
        # measurements (for example pollution readings) are regression targets
        # even when a small demo file contains only a few distinct values.
        numeric_values = pd.to_numeric(values, errors="coerce")
        is_integer_valued = bool(((numeric_values % 1).abs() < 1e-9).all())
        if unique_count <= 20 and is_integer_valued:
            return "classification", unique_count

        return "regression", None

    return "classification", values.nunique()


def profile_dataset(
    dataframe: pd.DataFrame,
    target_column: str | None = None,
) -> dict:
    if dataframe.empty:
        raise ValueError("The dataset is empty.")

    if target_column is None:
        target_column = dataframe.columns[-1]

    if target_column not in dataframe.columns:
        raise ValueError(f"Unknown target column: {target_column}")

    features = dataframe.drop(columns=[target_column])
    target = dataframe[target_column]

    task_type, n_classes = infer_task_type(target)

    missing_value_ratio = float(
        dataframe.isna().sum().sum() / dataframe.size
    )

    profile = DatasetProfile(
        n_rows=len(dataframe),
        n_features=len(features.columns),
        n_numeric_features=len(
            features.select_dtypes(include="number").columns
        ),
        n_categorical_features=len(
            features.select_dtypes(exclude="number").columns
        ),
        missing_value_ratio=missing_value_ratio,
        target_column=target_column,
        task_type=task_type,
        n_classes=n_classes,
    )

    result = asdict(profile)
    result["target_missing_rows"] = int(target.isna().sum())
    result["finite_target_rows"] = int(target.notna().sum())
    result["class_counts"] = []
    result["class_imbalance_ratio"] = None
    result["warnings"] = []

    if task_type == "classification":
        counts = target.dropna().value_counts()
        result["class_counts"] = [
            {"label": str(label), "count": int(count)}
            for label, count in counts.items()
        ]
        if len(counts) >= 2 and counts.min() > 0:
            ratio = float(counts.max() / counts.min())
            result["class_imbalance_ratio"] = round(ratio, 2)
            if ratio >= 3:
                result["warnings"].append(
                    "The target is imbalanced (largest class is at least 3× the smallest). "
                    "Accuracy can hide poor minority-class performance; compare macro F1 and balanced accuracy."
                )
            if counts.min() < 5:
                result["warnings"].append(
                    f"The smallest target class has only {int(counts.min())} rows. "
                    f"This limits classification cross-validation to at most {int(counts.min())} folds; "
                    "protected-group support is assessed separately below."
                )
    elif task_type == "regression":
        numeric_target = pd.to_numeric(target, errors="coerce")
        result["finite_target_rows"] = int(numeric_target.map(lambda value: pd.notna(value) and abs(value) != float("inf")).sum())

    if len(dataframe) < 100:
        result["warnings"].append(
            f"This dataset has {len(dataframe)} rows, a small demo sample. Treat scores as exploratory; "
            "sample sufficiency depends on the use case and class/group support, so do not use these estimates alone for decisions."
        )
    if result["target_missing_rows"]:
        result["warnings"].append(
            f"{result['target_missing_rows']} rows have a missing target and will be excluded from fitting."
        )
    if missing_value_ratio > 0:
        result["warnings"].append(
            "Missing feature values are imputed inside each training fold to avoid validation leakage."
        )

    if task_type == "unknown":
        result["warnings"].append(
            "The target type could not be inferred. Choose a target with at least two classes, "
            "or a numeric continuous target for regression."
        )

    return result


def profile_sensitive_groups(
    dataframe: pd.DataFrame,
    target_column: str,
    sensitive_attributes: list[str],
) -> dict:
    """Summarize the intersectional groups used by fairness evaluation."""
    if not sensitive_attributes:
        return {"groups": [], "warnings": []}
    if any(attribute not in dataframe.columns or attribute == target_column for attribute in sensitive_attributes):
        raise ValueError("Sensitive features must be dataset columns other than the target.")

    group_keys = dataframe[sensitive_attributes].fillna("<missing>").astype(str)
    labels = group_keys.apply(
        lambda row: " · ".join(f"{attribute}={row[attribute]}" for attribute in sensitive_attributes),
        axis=1,
    )
    summaries = []
    warnings = []
    target_values = dataframe[target_column].dropna().unique().tolist()
    target_type, target_class_count = infer_task_type(dataframe[target_column])
    binary_target = target_type == "classification" and target_class_count == 2

    for group_label, row_indexes in labels.groupby(labels, sort=False).groups.items():
        group_target = dataframe.loc[row_indexes, target_column].dropna()
        summary = {"group": str(group_label), "count": int(len(group_target))}
        if binary_target:
            class_counts = group_target.value_counts()
            summary["class_counts"] = [
                {"label": str(label), "count": int(class_counts.get(label, 0))}
                for label in target_values
            ]
            if any(int(class_counts.get(label, 0)) == 0 for label in target_values):
                warnings.append(
                    f"Protected group '{group_label}' has no examples from at least one target class. "
                    "Equalized-odds rates for that group cannot be estimated reliably."
                )
        summaries.append(summary)
        if len(group_target) < 20:
            warnings.append(
                f"Protected group '{group_label}' has {len(group_target)} usable rows; "
                "its fairness estimate may be noisy. The 20-row flag is a caution, not a universal minimum."
            )

    if len(summaries) > 20:
        warnings.append(
            f"The selected protected attributes create {len(summaries)} intersectional groups. "
            "High-cardinality groupings can leave too few examples per group; review the support counts before interpreting gaps."
        )

    return {"groups": summaries, "warnings": list(dict.fromkeys(warnings))}
