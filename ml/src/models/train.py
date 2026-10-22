"""Training entrypoint for the readmission risk models.

Usage:
    python -m src.models.train --config configs/config.yaml
"""

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.evaluation.metrics import (
    classification_metrics,
    confusion_counts,
    meets_promotion_thresholds,
)
from src.features.build_features import add_utilisation_features, build_preprocessor
from src.utils.config import load_config


def build_estimator(name: str, params: dict[str, Any]) -> Any:
    """Return an untrained estimator by config name."""
    options = {key: value for key, value in params.items() if key != "enabled"}
    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", **options)
    if name == "random_forest":
        return RandomForestClassifier(class_weight="balanced", random_state=42, **options)
    if name == "xgboost":
        from xgboost import XGBClassifier

        return XGBClassifier(eval_metric="logloss", random_state=42, **options)
    raise ValueError(f"Unknown model: {name}")


def main() -> None:
    """Train every enabled model, keep the best one and persist it."""
    parser = argparse.ArgumentParser(description="Train readmission risk models")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    args = parser.parse_args()

    config = load_config(args.config)
    dataset = config["dataset"]
    split = config["split"]

    frame = load_raw(dataset["raw_path"])
    frame = basic_clean(frame, config)
    frame = add_utilisation_features(frame)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])
    features = frame.drop(columns=[dataset["target_column"]])

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )

    results: dict[str, dict[str, float]] = {}
    best_name: str | None = None
    best_pipeline: Pipeline | None = None
    best_score = -1.0
    primary = config["evaluation"]["primary_metric"]

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue
        pipeline = Pipeline(
            [
                ("preprocess", build_preprocessor(x_train, config)),
                ("model", build_estimator(name, params)),
            ]
        )
        pipeline.fit(x_train, y_train)

        y_pred = pipeline.predict(x_test)
        y_proba = pipeline.predict_proba(x_test)[:, 1]
        metrics = classification_metrics(y_test, y_pred, y_proba)
        metrics.update(confusion_counts(y_test, y_pred))
        results[name] = metrics
        print(f"{name}: {json.dumps(metrics, indent=2)}")

        if metrics.get(primary, -1.0) > best_score:
            best_name = name
            best_pipeline = pipeline
            best_score = metrics[primary]

    if best_pipeline is None or best_name is None:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    thresholds = config["evaluation"]["thresholds"]
    promoted = meets_promotion_thresholds(results[best_name], thresholds)
    summary = {"best_model": best_name, "promoted": promoted, "results": results}

    output_dir = Path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, output_dir / config["artifacts"]["model_filename"])
    metrics_path = output_dir / config["artifacts"]["metrics_filename"]
    metrics_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Best model: {best_name} ({primary}={best_score:.4f}), promoted={promoted}")
    if not promoted:
        raise SystemExit(f"Best model failed the promotion thresholds {thresholds}")


if __name__ == "__main__":
    main()
