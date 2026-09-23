"""Training entrypoint for the patient risk and readmission models.

Usage:
    python -m src.models.train --config configs/config.yaml
    python -m src.models.train --config configs/config.yaml --target risk
    python -m src.models.train --config configs/config.yaml --dataset diabetes_130_us

Trains both the risk model and the 30-day readmission model by default (two
separate flows, sharing the same pipeline code, per
HealthForecastAI_Milestone2_Design.md section 4) - pass --target to train
just one.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from src.data.load_data import binarise_readmission_target, binarise_risk_target, load_raw
from src.data.preprocess import basic_clean, drop_unused_columns
from src.data.validate import validate_frame
from src.evaluation.metrics import (
    classification_metrics,
    confusion_counts,
    meets_promotion_thresholds,
)
from src.features.build_features import (
    add_history_features,
    add_utilisation_features,
    build_preprocessor,
)
from src.utils.config import load_config

TARGET_BUILDERS = {
    "readmission": lambda series, profile: binarise_readmission_target(
        series, profile["readmission_positive_label"]
    ),
    "risk": lambda series, profile: binarise_risk_target(series, profile["risk_negative_label"]),
}


def resolve_profile(config: dict[str, Any], dataset_name: str | None = None) -> dict[str, Any]:
    """Return the named dataset profile, or the config's active one."""
    dataset_config = config["dataset"]
    name = dataset_name or dataset_config["active"]
    try:
        return dataset_config["profiles"][name]
    except KeyError as exc:
        known = sorted(dataset_config["profiles"])
        raise ValueError(f"Unknown dataset profile '{name}'. Known profiles: {known}") from exc


def build_estimator(
    name: str, params: dict[str, Any], scale_pos_weight: float | None = None
) -> Any:
    """Return an untrained estimator by config name.

    ``scale_pos_weight`` is XGBoost's equivalent of the other two estimators'
    class_weight="balanced" - it has no class_weight parameter of its own.
    """
    options = {key: value for key, value in params.items() if key != "enabled"}
    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", **options)
    if name == "random_forest":
        return RandomForestClassifier(class_weight="balanced", random_state=42, **options)
    if name == "xgboost":
        from xgboost import XGBClassifier

        weight = scale_pos_weight if scale_pos_weight is not None else 1.0
        return XGBClassifier(
            eval_metric="logloss", random_state=42, scale_pos_weight=weight, **options
        )
    raise ValueError(f"Unknown model: {name}")


def compute_scale_pos_weight(y_train: pd.Series) -> float:
    """Return negatives/positives on the TRAINING split only.

    Computed from y_train alone - never from the full dataset - so no
    information about the held-out validation/test class balance leaks into a
    training hyperparameter.
    """
    positives = int((y_train == 1).sum())
    negatives = int((y_train == 0).sum())
    if positives == 0:
        raise ValueError(
            "Training split has no positive examples - cannot compute scale_pos_weight."
        )
    return negatives / positives


def split_dataset(
    features: pd.DataFrame,
    target: pd.Series,
    dates: pd.Series | None,
    split_config: dict[str, Any],
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, pd.Series]:
    """Return (x_train, x_val, x_test, y_train, y_val, y_test) without leakage.

    Uses a temporal split - train on the earliest admissions, validate on the
    next slice, test on the most recent - when the active profile carries a
    real date column and temporal_when_dated is set. This is a stronger test
    of production readiness than a random split: the model must generalise to
    *future* patients (ML Design section 6.10), and no row from the future can
    ever land in the training set. Falls back to a stratified random split
    otherwise (e.g. Diabetes 130-US has no usable calendar date).

    Either way, the preprocessing pipeline is fit only on x_train later (see
    main() below) - validation and test rows never influence imputation
    medians, category encodings or model hyperparameters.
    """
    test_size = split_config.get("test_size", 0.2)
    val_size = split_config.get("validation_size", 0.1)
    random_state = split_config.get("random_state", 42)
    stratify_enabled = split_config.get("stratify", True)

    use_temporal = (
        split_config.get("temporal_when_dated", True) and dates is not None and dates.notna().any()
    )

    if use_temporal:
        assert dates is not None  # narrows the type; guaranteed by use_temporal above
        order = dates.sort_values(kind="stable", na_position="last").index
        total = len(order)
        n_test = int(round(total * test_size))
        n_val = int(round(total * val_size))
        n_train = total - n_test - n_val
        if n_train <= 0 or n_val <= 0 or n_test <= 0:
            raise ValueError(
                f"Not enough rows ({total}) to carve out non-empty train/validation/test splits."
            )
        train_idx = order[:n_train]
        val_idx = order[n_train : n_train + n_val]
        test_idx = order[n_train + n_val :]
        return (
            features.loc[train_idx],
            features.loc[val_idx],
            features.loc[test_idx],
            target.loc[train_idx],
            target.loc[val_idx],
            target.loc[test_idx],
        )

    x_train, x_temp, y_train, y_temp = train_test_split(
        features,
        target,
        test_size=test_size + val_size,
        random_state=random_state,
        stratify=target if stratify_enabled else None,
    )
    relative_val = val_size / (test_size + val_size)
    x_val, x_test, y_val, y_test = train_test_split(
        x_temp,
        y_temp,
        test_size=1 - relative_val,
        random_state=random_state,
        stratify=y_temp if stratify_enabled else None,
    )
    return x_train, x_val, x_test, y_train, y_val, y_test


def prepare_features(
    frame: pd.DataFrame, profile: dict[str, Any], preprocessing: dict[str, Any]
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Run every dataset-agnostic step up to (but not including) target split.

    Order matters: history/utilisation features are engineered from the
    identifier and date columns while they are still present, and only
    dropped from the feature set afterwards - dropping them first would make
    add_history_features a silent no-op.
    """
    validated, rejections = validate_frame(frame, profile)
    cleaned = basic_clean(validated, profile, preprocessing)
    cleaned = add_history_features(cleaned, profile.get("id_column"), profile.get("date_column"))
    cleaned = add_utilisation_features(cleaned, profile.get("utilisation_columns"))
    return cleaned, rejections


def train_one_target(
    frame: pd.DataFrame,
    profile: dict[str, Any],
    config: dict[str, Any],
    target_name: str,
) -> dict[str, Any]:
    """Train every enabled model for one target on an already-loaded dataframe.

    Dependency-injecting the dataframe (rather than reading a file here) is
    what lets ml/tests/test_train_pipeline.py exercise this against a small
    synthetic fixture, without a real dataset present.
    """
    if target_name not in TARGET_BUILDERS:
        raise ValueError(f"Unknown target '{target_name}'. Known targets: {list(TARGET_BUILDERS)}")

    prepared, rejections = prepare_features(frame, profile, config.get("preprocessing", {}))

    target_column = profile["target_column"]
    target = TARGET_BUILDERS[target_name](prepared[target_column], profile)
    date_series = None
    date_column = profile.get("date_column")
    if date_column and date_column in prepared.columns:
        date_series = pd.to_datetime(prepared[date_column], errors="coerce")

    without_target = prepared.drop(columns=[target_column])
    features = drop_unused_columns(without_target, profile.get("drop_columns", []))

    x_train, x_val, x_test, y_train, y_val, y_test = split_dataset(
        features, target, date_series, config["split"]
    )

    imbalance_strategy = config.get("imbalance", {}).get("strategy", "none")
    scale_pos_weight = (
        compute_scale_pos_weight(y_train) if imbalance_strategy == "class_weight" else None
    )

    primary = config["evaluation"]["primary_metric"]
    validation_results: dict[str, dict[str, float]] = {}
    candidates: dict[str, Pipeline] = {}

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue
        pipeline = Pipeline(
            [
                ("preprocess", build_preprocessor(x_train, config)),
                ("model", build_estimator(name, params, scale_pos_weight)),
            ]
        )
        pipeline.fit(x_train, y_train)
        candidates[name] = pipeline

        val_pred = pipeline.predict(x_val)
        val_proba = pipeline.predict_proba(x_val)[:, 1]
        val_metrics = classification_metrics(y_val, val_pred, val_proba)
        val_metrics.update(confusion_counts(y_val, val_pred))
        validation_results[name] = val_metrics

    if not candidates:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    # Model selection uses VALIDATION metrics only. Picking the winner by test
    # metrics would make the test set part of model selection, biasing the
    # metric it is supposed to report honestly - the test split is touched
    # exactly once, below, after the winner is already chosen.
    best_name = max(candidates, key=lambda name: validation_results[name].get(primary, -1.0))
    best_pipeline = candidates[best_name]

    test_pred = best_pipeline.predict(x_test)
    test_proba = best_pipeline.predict_proba(x_test)[:, 1]
    test_metrics = classification_metrics(y_test, test_pred, test_proba)
    test_metrics.update(confusion_counts(y_test, test_pred))

    thresholds = config["evaluation"]["thresholds"]
    promoted = meets_promotion_thresholds(test_metrics, thresholds)

    return {
        "target": target_name,
        "dataset_profile": config["dataset"].get("active"),
        "best_model": best_name,
        "algorithm": best_name,
        "promoted": promoted,
        "metrics": test_metrics,
        "validation_results": validation_results,
        "rejected_rows": rejections,
        "split_sizes": {"train": len(x_train), "validation": len(x_val), "test": len(x_test)},
        "class_distribution": {
            "train": {"positive": int(y_train.sum()), "negative": int((y_train == 0).sum())},
            "validation": {"positive": int(y_val.sum()), "negative": int((y_val == 0).sum())},
            "test": {"positive": int(y_test.sum()), "negative": int((y_test == 0).sum())},
        },
        "imbalance_strategy": imbalance_strategy,
        "scale_pos_weight": scale_pos_weight,
        "feature_count": features.shape[1],
        "trained_at": datetime.now(UTC).isoformat(),
        "pipeline": best_pipeline,
    }


def main() -> None:
    """Train the requested target(s) and persist each winning pipeline."""
    parser = argparse.ArgumentParser(description="Train patient risk and readmission models")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    parser.add_argument("--dataset", default=None, help="Dataset profile name override")
    parser.add_argument(
        "--target",
        choices=sorted(TARGET_BUILDERS),
        default=None,
        help="Train just one flow; omit to train both risk and readmission",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    profile = resolve_profile(config, args.dataset)

    frame = load_raw(profile["raw_path"], profile.get("na_values"))

    targets = [args.target] if args.target else list(TARGET_BUILDERS)
    output_dir = Path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    any_failed = False
    for target_name in targets:
        result = train_one_target(frame, profile, config, target_name)
        pipeline = result.pop("pipeline")

        model_filename = config["artifacts"]["model_filename"].format(target=target_name)
        metrics_filename = config["artifacts"]["metrics_filename"].format(target=target_name)
        joblib.dump(pipeline, output_dir / model_filename)
        (output_dir / metrics_filename).write_text(json.dumps(result, indent=2), encoding="utf-8")

        print(f"[{target_name}] best_model={result['best_model']} metrics={result['metrics']}")
        if not result["promoted"]:
            any_failed = True
            print(
                f"[{target_name}] FAILED promotion thresholds {config['evaluation']['thresholds']}"
            )

    if any_failed:
        raise SystemExit("One or more models failed the promotion thresholds - see output above.")


if __name__ == "__main__":
    main()
