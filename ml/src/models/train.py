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
from src.evaluation.calibration import calibrate_model
from src.evaluation.metrics import (
    classification_metrics,
    confusion_counts,
    find_best_threshold,
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
        return RandomForestClassifier(
            class_weight="balanced",
            random_state=42,
            **options,
        )

    if name == "xgboost":
        from xgboost import XGBClassifier

        return XGBClassifier(
            eval_metric="logloss",
            random_state=42,
            **options,
        )

    raise ValueError(f"Unknown model: {name}")


def build_pipeline(
    name: str,
    params: dict[str, Any],
    x_train,
    config: dict[str, Any],
) -> Pipeline:
    """Build a preprocessing + estimator pipeline."""
    return Pipeline(
        [
            ("preprocess", build_preprocessor(x_train, config)),
            ("model", build_estimator(name, params)),
        ]
    )


def main() -> None:
    """Train, calibrate, evaluate, and persist the readmission risk model."""
    parser = argparse.ArgumentParser(description="Train readmission risk models")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    args = parser.parse_args()

    config = load_config(args.config)

    dataset = config["dataset"]
    split = config["split"]
    evaluation = config["evaluation"]

    frame = load_raw(dataset["raw_path"])
    frame = basic_clean(frame, config)
    frame = add_utilisation_features(frame)

    target = binarise_target(
        frame[dataset["target_column"]],
        dataset["positive_label"],
    )

    features = frame.drop(columns=[dataset["target_column"]])
    # 1. Hold out final test set
    test_size = float(split["test_size"])
    validation_size = float(split["validation_size"])
    calibration_size = float(split["calibration_size"])

    x_development, x_test, y_development, y_test = train_test_split(
        features,
        target,
        test_size=test_size,
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )

    # 2. Hold out validation + calibration from development data
    holdout_size = validation_size + calibration_size

    if holdout_size >= (1.0 - test_size):
        raise ValueError("validation_size + calibration_size must leave room for training data")

    development_holdout_fraction = holdout_size / (1.0 - test_size)

    x_train, x_holdout, y_train, y_holdout = train_test_split(
        x_development,
        y_development,
        test_size=development_holdout_fraction,
        random_state=split["random_state"],
        stratify=(y_development if split.get("stratify", True) else None),
    )

    # 3. Split holdout equally into validation and calibration
    calibration_fraction = calibration_size / holdout_size

    x_validation, x_calibration, y_validation, y_calibration = train_test_split(
        x_holdout,
        y_holdout,
        test_size=calibration_fraction,
        random_state=split["random_state"],
        stratify=(y_holdout if split.get("stratify", True) else None),
    )

    print(
        "Dataset split: "
        f"train={len(x_train)}, "
        f"validation={len(x_validation)}, "
        f"calibration={len(x_calibration)}, "
        f"test={len(x_test)}"
    )

    # ------------------------------------------------------------------
    # 4. Train candidate models and evaluate them on VALIDATION only.
    # ------------------------------------------------------------------
    validation_results: dict[str, dict[str, Any]] = {}

    primary = evaluation["primary_metric"]
    thresholds = evaluation["thresholds"]
    minimum_recall = float(thresholds.get("recall", 0.50))

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue

        pipeline = build_pipeline(
            name=name,
            params=params,
            x_train=x_train,
            config=config,
        )

        print(f"\nTraining {name}...")

        pipeline.fit(x_train, y_train)

        validation_proba = pipeline.predict_proba(x_validation)[:, 1]

        decision_threshold, _ = find_best_threshold(
            y_validation,
            validation_proba,
            minimum_recall=minimum_recall,
        )

        validation_pred = (validation_proba >= decision_threshold).astype(int)

        metrics = classification_metrics(
            y_validation,
            validation_pred,
            validation_proba,
        )

        metrics.update(
            confusion_counts(
                y_validation,
                validation_pred,
            )
        )

        metrics["decision_threshold"] = decision_threshold

        validation_results[name] = metrics

        print(f"\n{name} validation metrics:" f"\n{json.dumps(metrics, indent=2)}")

    if not validation_results:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    # ------------------------------------------------------------------
    # 5. Select the model using VALIDATION only.
    # ------------------------------------------------------------------
    eligible_models = {
        name: metrics
        for name, metrics in validation_results.items()
        if meets_promotion_thresholds(metrics, thresholds)
    }

    if not eligible_models:
        raise SystemExit(
            "No model passed the configured promotion thresholds "
            f"{thresholds} on the validation set."
        )

    best_name = max(
        eligible_models,
        key=lambda name: eligible_models[name].get(primary, -1.0),
    )

    print(f"\nSelected model: {best_name}")

    # ------------------------------------------------------------------
    # 6. Fit selected model on TRAIN only.
    #
    # This is intentional: calibration data must remain unseen by the
    # underlying model.
    # ------------------------------------------------------------------
    best_pipeline = build_pipeline(
        name=best_name,
        params=config["models"][best_name],
        x_train=x_train,
        config=config,
    )

    best_pipeline.fit(x_train, y_train)

    # ------------------------------------------------------------------
    # 7. Calibrate using a separate CALIBRATION set.
    # ------------------------------------------------------------------
    calibrated_model = calibrate_model(
        best_pipeline,
        x_calibration,
        y_calibration,
    )

    calibration_proba = calibrated_model.predict_proba(x_calibration)[:, 1]

    selected_threshold, calibration_threshold_metrics = find_best_threshold(
        y_calibration,
        calibration_proba,
        minimum_recall=minimum_recall,
    )

    print(
        f"\nCalibrated decision threshold: "
        f"{selected_threshold:.4f}"
        f"\nCalibration threshold metrics:"
        f"\n{json.dumps(calibration_threshold_metrics, indent=2)}"
    )

    # ------------------------------------------------------------------
    # 8. Evaluate ONCE on the untouched TEST set.
    # ------------------------------------------------------------------
    test_proba = calibrated_model.predict_proba(x_test)[:, 1]

    test_pred = (test_proba >= selected_threshold).astype(int)

    test_metrics = classification_metrics(
        y_test,
        test_pred,
        test_proba,
    )

    test_metrics.update(
        confusion_counts(
            y_test,
            test_pred,
        )
    )

    test_metrics["decision_threshold"] = selected_threshold

    print(f"\n{best_name} calibrated final test metrics:" f"\n{json.dumps(test_metrics, indent=2)}")

    # ------------------------------------------------------------------
    # 9. Save calibrated model and experiment metadata.
    # ------------------------------------------------------------------
    output_dir = Path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(
        calibrated_model,
        output_dir / config["artifacts"]["model_filename"],
    )

    # Promotion is determined from DEVELOPMENT data, not TEST.
    promoted = meets_promotion_thresholds(
        validation_results[best_name],
        thresholds,
    )

    summary = {
        "best_model": best_name,
        "decision_threshold": selected_threshold,
        "validation_results": validation_results,
        "calibration_metrics": calibration_threshold_metrics,
        "test_metrics": test_metrics,
        "promotion_thresholds": thresholds,
        "promoted": promoted,
        "split": {
            "test_size": split["test_size"],
            "validation_size": split["validation_size"],
            "calibration_size": split["calibration_size"],
            "random_state": split["random_state"],
        },
        "calibration": {
            "method": "sigmoid",
        },
    }

    metrics_path = output_dir / config["artifacts"]["metrics_filename"]

    metrics_path.write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )

    print(f"\nCalibrated model saved to: " f"{output_dir / config['artifacts']['model_filename']}")
    print(f"Metrics saved to: {metrics_path}")

    if not promoted:
        raise SystemExit(
            "Selected model failed the promotion thresholds " f"on the validation set: {thresholds}"
        )


if __name__ == "__main__":
    main()
