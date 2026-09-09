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
from src.features.build_features import (
    add_utilisation_features,
    build_preprocessor,
)
from src.utils.config import load_config


def build_estimator(
    name: str,
    params: dict[str, Any],
    scale_pos_weight: float | None = None,
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

        return XGBClassifier(
            eval_metric="logloss",
            random_state=42,
            scale_pos_weight=scale_pos_weight or 1.0,
            **options,
        )

    raise ValueError(f"Unknown model: {name}")


def patient_level_split(
    frame,
    target,
    random_state: int,
    test_size: float,
    validation_size: float,
):
    """Split encounters so that each patient belongs to one split only."""

    if "patient_nbr" not in frame.columns:
        raise ValueError("patient_nbr is required for patient-level splitting.")

    # Keep one copy of each patient for creating the split.
    patients = frame["patient_nbr"].drop_duplicates()

    train_patients, test_patients = train_test_split(
        patients,
        test_size=test_size,
        random_state=random_state,
    )

    # Validation size is relative to the remaining patients.
    validation_fraction = validation_size / (1.0 - test_size)

    train_patients, validation_patients = train_test_split(
        train_patients,
        test_size=validation_fraction,
        random_state=random_state,
    )

    train_mask = frame["patient_nbr"].isin(train_patients)
    validation_mask = frame["patient_nbr"].isin(validation_patients)
    test_mask = frame["patient_nbr"].isin(test_patients)

    x = frame.drop(columns=["readmitted"])

    x_train = x.loc[train_mask].copy()
    x_validation = x.loc[validation_mask].copy()
    x_test = x.loc[test_mask].copy()

    y_train = target.loc[train_mask].copy()
    y_validation = target.loc[validation_mask].copy()
    y_test = target.loc[test_mask].copy()

    # Patient ID is only used for splitting and must never enter the model.
    x_train = x_train.drop(columns=["patient_nbr"])
    x_validation = x_validation.drop(columns=["patient_nbr"])
    x_test = x_test.drop(columns=["patient_nbr"])

    return (
        x_train,
        x_validation,
        x_test,
        y_train,
        y_validation,
        y_test,
        set(train_patients),
        set(validation_patients),
        set(test_patients),
    )


def main() -> None:
    """Train models, select using validation, then evaluate on test."""

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

    # Load the raw dataset.
    frame = load_raw(dataset["raw_path"])

    # Keep patient_nbr temporarily for patient-level splitting.
    preprocessing = config.get("preprocessing", {})

    drop_columns = [
        column for column in preprocessing.get("drop_columns", []) if column != "patient_nbr"
    ]

    temporary_config = {
        **config,
        "preprocessing": {
            **preprocessing,
            "drop_columns": drop_columns,
        },
    }

    frame = basic_clean(frame, temporary_config)

    # Convert the original three-class target into a binary target.
    target = binarise_target(
        frame[dataset["target_column"]],
        dataset["positive_label"],
    )

    (
        x_train,
        x_validation,
        x_test,
        y_train,
        y_validation,
        y_test,
        train_patients,
        validation_patients,
        test_patients,
    ) = patient_level_split(
        frame,
        target,
        random_state=split["random_state"],
        test_size=split["test_size"],
        validation_size=split["validation_size"],
    )

    # Verify that no patient appears in more than one split.
    if train_patients & validation_patients:
        raise ValueError("Patient overlap detected between train and validation.")

    if train_patients & test_patients:
        raise ValueError("Patient overlap detected between train and test.")

    if validation_patients & test_patients:
        raise ValueError("Patient overlap detected between validation and test.")

    print("Patient-level split successful")
    print(f"Train patients: {len(train_patients)}")
    print(f"Validation patients: {len(validation_patients)}")
    print(f"Test patients: {len(test_patients)}")

    print("\nEncounter split:")
    print(f"Train: {len(x_train)}")
    print(f"Validation: {len(x_validation)}")
    print(f"Test: {len(x_test)}")

    # Calculate class imbalance using training data only.
    negative_count = (y_train == 0).sum()
    positive_count = (y_train == 1).sum()

    scale_pos_weight = negative_count / positive_count if positive_count > 0 else 1.0

    print("\nTraining class distribution:")
    print(f"Negative cases: {negative_count}")
    print(f"Positive cases: {positive_count}")
    print(f"XGBoost scale_pos_weight: " f"{scale_pos_weight:.4f}")

    # Apply the same deterministic feature engineering to each split.
    x_train = add_utilisation_features(x_train)
    x_validation = add_utilisation_features(x_validation)
    x_test = add_utilisation_features(x_test)

    # Store validation results for model selection.
    validation_results: dict[str, dict[str, float]] = {}

    trained_models: dict[str, Pipeline] = {}

    best_name: str | None = None
    best_score = -1.0

    primary = config["evaluation"]["primary_metric"]

    # Train and evaluate every enabled model on validation data.
    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue

        pipeline = Pipeline(
            [
                (
                    "preprocess",
                    build_preprocessor(
                        x_train,
                        config,
                    ),
                ),
                (
                    "model",
                    build_estimator(
                        name,
                        params,
                        scale_pos_weight=scale_pos_weight,
                    ),
                ),
            ]
        )

        pipeline.fit(
            x_train,
            y_train,
        )

        y_validation_pred = pipeline.predict(x_validation)

        y_validation_proba = pipeline.predict_proba(x_validation)[:, 1]

        metrics = classification_metrics(
            y_validation,
            y_validation_pred,
            y_validation_proba,
        )

        metrics.update(
            confusion_counts(
                y_validation,
                y_validation_pred,
            )
        )

        validation_results[name] = metrics
        trained_models[name] = pipeline

        print(f"\n{name} validation results:")
        print(
            json.dumps(
                metrics,
                indent=2,
            )
        )

        # Select the best model using validation ROC-AUC.
        if metrics.get(primary, -1.0) > best_score:
            best_name = name
            best_score = metrics[primary]

    if best_name is None:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    best_pipeline = trained_models[best_name]

    print(f"\nValidation winner: {best_name} " f"({primary}={best_score:.4f})")

    # Evaluate the selected model once on the untouched test set.
    y_test_pred = best_pipeline.predict(x_test)
    y_test_proba = best_pipeline.predict_proba(x_test)[:, 1]

    test_metrics = classification_metrics(
        y_test,
        y_test_pred,
        y_test_proba,
    )

    test_metrics.update(
        confusion_counts(
            y_test,
            y_test_pred,
        )
    )

    print("\nFinal test results:")
    print(
        json.dumps(
            test_metrics,
            indent=2,
        )
    )

    # Promotion is based on final test performance.
    thresholds = config["evaluation"]["thresholds"]

    promoted = meets_promotion_thresholds(
        test_metrics,
        thresholds,
    )

    summary = {
        "best_model": best_name,
        "promoted": promoted,
        "validation_results": validation_results,
        "test_results": test_metrics,
    }

    output_dir = Path(config["artifacts"]["output_dir"])

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    metrics_path = output_dir / config["artifacts"]["metrics_filename"]

    metrics_path.write_text(
        json.dumps(
            summary,
            indent=2,
        ),
        encoding="utf-8",
    )

    # Save the model only when it passes the promotion criteria.
    if promoted:
        joblib.dump(
            best_pipeline,
            output_dir / config["artifacts"]["model_filename"],
        )

        print(
            "\nModel promoted and saved:" f" {output_dir / config['artifacts']['model_filename']}"
        )
    else:
        print("\nModel was NOT promoted." " Existing model artifact was not replaced.")
        raise SystemExit("Selected model failed the promotion thresholds " f"{thresholds}")


if __name__ == "__main__":
    main()
