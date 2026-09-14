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
from sklearn.model_selection import ParameterGrid, train_test_split
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


def build_estimator(
    name: str,
    params: dict[str, Any],
    y_train: Any = None,
) -> Any:
    """Return an untrained estimator by config name."""
    options = {key: value for key, value in params.items() if key != "enabled"}

    if name == "logistic_regression":
        return LogisticRegression(
            class_weight="balanced",
            **options,
        )

    if name == "random_forest":
        return RandomForestClassifier(
            class_weight="balanced",
            random_state=42,
            **options,
        )

    if name == "xgboost":
        from xgboost import XGBClassifier

        if y_train is not None:
            negative_count = (y_train == 0).sum()
            positive_count = (y_train == 1).sum()

            if positive_count > 0:
                options["scale_pos_weight"] = negative_count / positive_count

        return XGBClassifier(
            eval_metric="logloss",
            random_state=42,
            **options,
        )

    raise ValueError(f"Unknown model: {name}")


def tune_xgboost(
    x_train: Any,
    y_train: Any,
    x_val: Any,
    y_val: Any,
    config: dict[str, Any],
) -> tuple[dict[str, Any], float]:
    """Find the best XGBoost parameters using the validation set."""
    xgb_params = config["models"]["xgboost"]

    param_grid = {
        "n_estimators": [200, 400],
        "max_depth": [4, 6],
        "learning_rate": [0.03, 0.05],
        "min_child_weight": [1, 3],
    }

    best_params: dict[str, Any] = {}
    best_score = -1.0

    for candidate in ParameterGrid(param_grid):
        params = {
            **xgb_params,
            **candidate,
        }

        pipeline = Pipeline(
            [
                (
                    "preprocess",
                    build_preprocessor(x_train, config),
                ),
                (
                    "model",
                    build_estimator(
                        "xgboost",
                        params,
                        y_train,
                    ),
                ),
            ]
        )

        pipeline.fit(x_train, y_train)

        y_val_proba = pipeline.predict_proba(x_val)[:, 1]

        validation_metrics = classification_metrics(
            y_val,
            (y_val_proba >= 0.5).astype(int),
            y_val_proba,
        )

        score = validation_metrics["roc_auc"]

        print(f"XGBoost params={candidate} " f"validation_roc_auc={score:.4f}")

        if score > best_score:
            best_score = score
            best_params = candidate

    print(f"Best XGBoost params: {best_params}, " f"validation_roc_auc={best_score:.4f}")

    return best_params, best_score


def main() -> None:
    """Train every enabled model, keep the best one and persist it."""
    parser = argparse.ArgumentParser(description="Train readmission risk models")
    parser.add_argument(
        "--config",
        default=None,
        help="Path to config.yaml",
    )
    args = parser.parse_args()

    config = load_config(args.config)

    dataset = config["dataset"]
    split = config["split"]

    # Load and prepare dataset
    frame = load_raw(dataset["raw_path"])
    frame = basic_clean(frame, config)
    frame = add_utilisation_features(frame)

    target = binarise_target(
        frame[dataset["target_column"]],
        dataset["positive_label"],
    )
    features = frame.drop(columns=[dataset["target_column"]])

    # ---------------------------------------------------------
    # Train / Validation / Test split
    # ---------------------------------------------------------
    # First split:
    #   80% -> train + validation
    #   20% -> test
    x_train_val, x_test, y_train_val, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )

    # Convert validation_size from total-dataset fraction
    # into fraction of the remaining train+validation data.
    validation_fraction = split["validation_size"] / (1 - split["test_size"])

    # Second split:
    #   70% -> train
    #   10% -> validation
    x_train, x_val, y_train, y_val = train_test_split(
        x_train_val,
        y_train_val,
        test_size=validation_fraction,
        random_state=split["random_state"],
        stratify=y_train_val if split.get("stratify", True) else None,
    )

    print(
        f"Train shape: {x_train.shape}, "
        f"Validation shape: {x_val.shape}, "
        f"Test shape: {x_test.shape}"
    )

    print(f"Train target distribution: {y_train.value_counts().to_dict()}")
    print(f"Validation target distribution: " f"{y_val.value_counts().to_dict()}")
    print(f"Test target distribution: {y_test.value_counts().to_dict()}")

    # ---------------------------------------------------------
    # Train enabled models
    # ---------------------------------------------------------
    results: dict[str, dict[str, float]] = {}

    best_name: str | None = None
    best_pipeline: Pipeline | None = None
    best_score = -1.0

    primary = config["evaluation"]["primary_metric"]

    # Tune XGBoost using the validation set
    best_xgb_params, best_xgb_val_score = tune_xgboost(
        x_train,
        y_train,
        x_val,
        y_val,
        config,
    )

    print(f"Tuned XGBoost validation ROC-AUC: " f"{best_xgb_val_score:.4f}")

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue
        model_params = params.copy()

        if name == "xgboost":
            model_params.update(best_xgb_params)

        pipeline = Pipeline(
            [
                (
                    "preprocess",
                    build_preprocessor(x_train, config),
                ),
                (
                    "model",
                    build_estimator(
                        name,
                        model_params,
                        y_train,
                    ),
                ),
            ]
        )

        pipeline.fit(x_train, y_train)

        # Current baseline evaluation is performed on test data.
        y_pred = pipeline.predict(x_test)
        y_proba = pipeline.predict_proba(x_test)[:, 1]

        metrics = classification_metrics(
            y_test,
            y_pred,
            y_proba,
        )

        metrics.update(
            confusion_counts(
                y_test,
                y_pred,
            )
        )

        results[name] = metrics

        print(f"{name}: " f"{json.dumps(metrics, indent=2)}")

        if metrics.get(primary, -1.0) > best_score:
            best_name = name
            best_pipeline = pipeline
            best_score = metrics[primary]

    # ---------------------------------------------------------
    # Select best model
    # ---------------------------------------------------------
    if best_pipeline is None or best_name is None:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    thresholds = config["evaluation"]["thresholds"]

    promoted = meets_promotion_thresholds(
        results[best_name],
        thresholds,
    )

    summary = {
        "best_model": best_name,
        "promoted": promoted,
        "results": results,
    }

    # ---------------------------------------------------------
    # Save model and metrics
    # ---------------------------------------------------------
    output_dir = Path(config["artifacts"]["output_dir"])

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        best_pipeline,
        output_dir / config["artifacts"]["model_filename"],
    )

    metrics_path = output_dir / config["artifacts"]["metrics_filename"]

    metrics_path.write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )

    print(f"Best model: {best_name} " f"({primary}={best_score:.4f}), " f"promoted={promoted}")
    # ---------------------------------------------------------
    # Final training on train + validation data
    # ---------------------------------------------------------
    final_x = x_train_val
    final_y = y_train_val

    final_params = config["models"][best_name].copy()

    if best_name == "xgboost":
        final_params.update(best_xgb_params)

    final_pipeline = Pipeline(
        [
            (
                "preprocess",
                build_preprocessor(final_x, config),
            ),
            (
                "model",
                build_estimator(
                    best_name,
                    final_params,
                    final_y,
                ),
            ),
        ]
    )

    final_pipeline.fit(final_x, final_y)

    final_pred = final_pipeline.predict(x_test)
    final_proba = final_pipeline.predict_proba(x_test)[:, 1]

    final_metrics = classification_metrics(
        y_test,
        final_pred,
        final_proba,
    )

    final_metrics.update(
        confusion_counts(
            y_test,
            final_pred,
        )
    )

    print(f"Final {best_name} test metrics: " f"{json.dumps(final_metrics, indent=2)}")

    if not promoted:
        raise SystemExit("Best model failed the promotion thresholds " f"{thresholds}")


if __name__ == "__main__":
    main()
