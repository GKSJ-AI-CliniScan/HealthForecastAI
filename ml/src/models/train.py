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
    select_decision_threshold,
)
from src.features.build_features import build_features, build_preprocessor
from src.utils.config import load_config

REPO_ROOT = Path(__file__).resolve().parents[3]

# Identifiers must never reach the model. patient_nbr survives basic_clean
# because the database seeding needs it; here it would be a per-patient number
# the model can memorise, inflating scores on a dataset this size.
IDENTIFIER_COLUMNS = ("encounter_id", "patient_nbr")


def resolve_path(value: str) -> Path:
    """Resolve a config path against the repository root.

    Paths in config.yaml are written relative to the repo root, so the training
    run works the same from the repo root or from ml/.
    """
    candidate = Path(value)
    return candidate if candidate.is_absolute() else REPO_ROOT / candidate


def positive_class_weight(y: Any) -> float:
    """Return negatives / positives, the imbalance ratio XGBoost needs.

    Logistic regression and random forest take ``class_weight="balanced"`` and
    compute this themselves. XGBoost has no such option: without an explicit
    ``scale_pos_weight`` it optimises for the majority class, which on a target
    that is roughly 9% positive means it learns to predict "no readmission" for
    almost everyone.
    """
    positives = int(sum(y))
    negatives = len(y) - positives
    if positives == 0:
        raise ValueError("Training data contains no positive examples.")
    return negatives / positives


def build_estimator(name: str, params: dict[str, Any], y_train: Any = None) -> Any:
    """Return an untrained estimator by config name."""
    options = {key: value for key, value in params.items() if key != "enabled"}
    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", **options)
    if name == "random_forest":
        return RandomForestClassifier(class_weight="balanced", random_state=42, **options)
    if name == "xgboost":
        from xgboost import XGBClassifier

        # Only set scale_pos_weight when the config has not pinned it, so an
        # explicit value in config.yaml still wins.
        if y_train is not None and "scale_pos_weight" not in options:
            options["scale_pos_weight"] = positive_class_weight(y_train)
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

    frame = load_raw(resolve_path(dataset["raw_path"]))
    frame = basic_clean(frame, config)
    # Milestone 1 built prior-visit and medication-change features; use them.
    # Medication instability during a stay is one of the stronger published
    # predictors of an early return, and it was not reaching the model.
    frame = build_features(frame)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])
    drop_from_features = [dataset["target_column"]]
    drop_from_features += [c for c in IDENTIFIER_COLUMNS if c in frame.columns]
    features = frame.drop(columns=drop_from_features)
    print(f"Dropped from features: {drop_from_features}")

    stratify = split.get("stratify", True)
    x_trainval, x_test, y_trainval, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if stratify else None,
    )
    # validation_size in the config is a fraction of the full dataset, same as
    # test_size, so it is rescaled to a fraction of what train_test_split above
    # left in x_trainval.
    val_fraction = split["validation_size"] / (1 - split["test_size"])
    x_train, x_val, y_train, y_val = train_test_split(
        x_trainval,
        y_trainval,
        test_size=val_fraction,
        random_state=split["random_state"],
        stratify=y_trainval if stratify else None,
    )

    results: dict[str, dict[str, float]] = {}
    best_name: str | None = None
    best_pipeline: Pipeline | None = None
    best_score = -1.0
    primary = config["evaluation"]["primary_metric"]
    thresholds = config["evaluation"]["thresholds"]
    min_recall = float(thresholds.get("recall", 0.50))

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue
        pipeline = Pipeline(
            [
                ("preprocess", build_preprocessor(x_train, config)),
                ("model", build_estimator(name, params, y_train)),
            ]
        )
        pipeline.fit(x_train, y_train)

        # The default 0.5 cutoff from predict() is not tuned to the recall the
        # platform needs, so pick the operating point off the precision-recall
        # curve instead. It is selected on the validation split and only then
        # applied to the test split - choosing it on the test set itself would
        # bias the reported test recall/precision upward.
        y_proba_val = pipeline.predict_proba(x_val)[:, 1]
        decision_threshold, val_precision, val_recall = select_decision_threshold(
            y_val, y_proba_val, min_recall
        )

        y_proba_test = pipeline.predict_proba(x_test)[:, 1]
        y_pred_test = (y_proba_test >= decision_threshold).astype(int)

        metrics = classification_metrics(y_test, y_pred_test, y_proba_test)
        metrics["decision_threshold"] = decision_threshold
        metrics["validation_recall"] = val_recall
        metrics["validation_precision"] = val_precision
        metrics.update(confusion_counts(y_test, y_pred_test))
        results[name] = metrics
        print(f"{name}: {json.dumps(metrics, indent=2)}")

        if metrics.get(primary, -1.0) > best_score:
            best_name = name
            best_pipeline = pipeline
            best_score = metrics[primary]

    if best_pipeline is None or best_name is None:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    promoted = meets_promotion_thresholds(results[best_name], thresholds)
    summary = {
        "best_model": best_name,
        "promoted": promoted,
        "decision_threshold": results[best_name]["decision_threshold"],
        "results": results,
    }

    output_dir = resolve_path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, output_dir / config["artifacts"]["model_filename"])
    metrics_path = output_dir / config["artifacts"]["metrics_filename"]
    metrics_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Best model: {best_name} ({primary}={best_score:.4f}), promoted={promoted}")
    if not promoted:
        raise SystemExit(f"Best model failed the promotion thresholds {thresholds}")


if __name__ == "__main__":
    main()
