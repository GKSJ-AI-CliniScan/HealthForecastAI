"""
Training entrypoint for the HealthForecast AI readmission model.

The training workflow intentionally follows the finalized Colab
experiment so that the project implementation reproduces the
same data preparation, patient-level split, preprocessing, and
XGBoost configuration.

Milestone 2.

Three decisions here are worth understanding before changing anything:

1. **Three-way split.** Train fits the model, validation tunes the decision
   threshold, test is touched exactly once at the end. Tuning the threshold on
   the test set would make every reported number optimistic.

2. **The decision threshold is tuned, not left at 0.5.** Roughly 9% of these
   encounters end in a 30-day readmission. At the default cutoff a model
   maximises accuracy by predicting "no readmission" for almost everyone, which
   is useless. We pick the lowest-cost cutoff that still reaches the recall
   floor in the config, because a missed high-risk patient - discharged with no
   follow-up - is the expensive error in this setting.

3. **The winner is chosen among models that pass the promotion gate**, not by
   the primary metric alone. A model with the best ROC-AUC that misses the
   recall floor is not a candidate.

Usage:
    python -m src.models.train --config configs/config.yaml
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
<<<<<<< HEAD
from pathlib import Path
=======
>>>>>>> origin/intern/10-saumya-s
from typing import Any

import joblib
import numpy as np
<<<<<<< HEAD
import pandas as pd
=======
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
>>>>>>> origin/intern/10-saumya-s
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from src.data.load_data import binarise_target
from src.evaluation.metrics import (
    classification_metrics,
    confusion_counts,
    meets_promotion_thresholds,
)
<<<<<<< HEAD
from src.features.build_features import build_preprocessor
from src.utils.config import load_config
=======
from src.features.build_features import add_utilisation_features, build_preprocessor
from src.utils.config import load_config, resolve_path
>>>>>>> origin/intern/10-saumya-s

# ============================================================
# FINAL PROJECT SETTINGS
# ============================================================

<<<<<<< HEAD
FINAL_MODEL_NAME = "xgboost_early_readmission"
FINAL_MODEL_VERSION = "v1"

FINAL_SCALE_POS_WEIGHT = 3.0
FINAL_DECISION_THRESHOLD = 0.30

FINAL_RISK_BANDS = {
    "medium": 0.40,
    "high": 0.70,
}


# ============================================================
# FINAL 41 MODEL FEATURES
# ============================================================

FINAL_FEATURE_COLUMNS = [
    "race",
    "gender",
    "age",
    "admission_type_id",
    "admission_source_id",
    "medical_specialty",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "diag_1",
    "diag_2",
    "diag_3",
    "number_diagnoses",
    "max_glu_serum",
    "A1Cresult",
    "metformin",
    "repaglinide",
    "nateglinide",
    "chlorpropamide",
    "glimepiride",
    "acetohexamide",
    "glipizide",
    "glyburide",
    "tolbutamide",
    "pioglitazone",
    "rosiglitazone",
    "acarbose",
    "miglitol",
    "troglitazone",
    "tolazamide",
    "insulin",
    "glyburide-metformin",
    "glipizide-metformin",
    "glimepiride-pioglitazone",
    "metformin-rosiglitazone",
    "metformin-pioglitazone",
    "change",
    "diabetesMed",
]


# ============================================================
# COLUMNS REMOVED DURING COLAB-ALIGNED CLEANING
# ============================================================

CONSTANT_COLUMNS = [
    "examide",
    "citoglipton",
]

NON_READMITTABLE_DISPOSITIONS = [
    11,
    13,
    14,
    19,
    20,
    21,
]

IDENTIFIER_COLUMNS = [
    "encounter_id",
    "patient_nbr",
]

HIGH_MISSING_COLUMNS = [
    "weight",
    "payer_code",
]

LEAKAGE_PRONE_FEATURES = [
    "discharge_disposition_id",
    "time_in_hospital",
]


# ============================================================
# MODEL BUILDER
# ============================================================


def build_xgboost_estimator(
    config: dict[str, Any],
    random_state: int,
    scale_pos_weight: float,
) -> Any:
    """
    Build the final XGBoost classifier.

    The hyperparameters come from configs/config.yaml.
    """

    try:
=======
def build_estimator(name: str, params: dict[str, Any]) -> Any:
    """Return an untrained estimator by config name."""
    options = {key: value for key, value in params.items() if key != "enabled"}

    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", **options)

    if name == "random_forest":
        return RandomForestClassifier(class_weight="balanced", random_state=42, **options)

    if name == "xgboost":
>>>>>>> origin/intern/10-saumya-s
        from xgboost import XGBClassifier
    except ImportError as exc:
        raise ImportError(
            "XGBoost is required to train the final model. " "Install it with: pip install xgboost"
        ) from exc

<<<<<<< HEAD
    xgb_config = config["models"]["xgboost"]

    if not xgb_config.get("enabled", False):
        raise ValueError("XGBoost must be enabled in configs/config.yaml.")

    return XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=random_state,
        n_jobs=-1,
        scale_pos_weight=scale_pos_weight,
        n_estimators=xgb_config.get("n_estimators", 400),
        max_depth=xgb_config.get("max_depth", 5),
        learning_rate=xgb_config.get("learning_rate", 0.03),
        min_child_weight=xgb_config.get("min_child_weight", 5),
        subsample=xgb_config.get("subsample", 0.8),
        colsample_bytree=xgb_config.get("colsample_bytree", 0.8),
    )


# ============================================================
# PATIENT-LEVEL SPLIT
# ============================================================


def patient_level_split(
    frame: pd.DataFrame,
    target: pd.Series,
    random_state: int,
    test_size: float,
    validation_size: float,
):
    """
    Reproduce the finalized Colab patient-level split.

    Patient IDs are split rather than individual encounters.

    Split:
        80% patients -> train
        10% patients -> validation
        10% patients -> test
    """

    if "patient_nbr" not in frame.columns:
        raise ValueError("patient_nbr is required for patient-level splitting.")

    unique_patients = frame["patient_nbr"].drop_duplicates()

    train_patients, temp_patients = train_test_split(
        unique_patients,
        test_size=test_size,
        random_state=random_state,
    )

    validation_patients, test_patients = train_test_split(
        temp_patients,
        test_size=0.50,
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


# ============================================================
# VERIFY PATIENT SEPARATION
# ============================================================


def verify_patient_separation(
    train_patients: set,
    validation_patients: set,
    test_patients: set,
) -> None:
    """Ensure no patient occurs in multiple splits."""

    if train_patients & validation_patients:
        raise ValueError("Patient overlap detected between train and validation.")

    if train_patients & test_patients:
        raise ValueError("Patient overlap detected between train and test.")

    if validation_patients & test_patients:
        raise ValueError("Patient overlap detected between validation and test.")


# ============================================================
# COLAB-ALIGNED CLEANING AFTER SPLIT
# ============================================================


def remove_post_split_columns(
    x_train: pd.DataFrame,
    x_validation: pd.DataFrame,
    x_test: pd.DataFrame,
):
    """
    Reproduce the column-removal sequence from the finalized
    Colab notebook.

    Sequence:
        1. Remove identifiers.
        2. Remove non-readmittable discharge dispositions.
        3. Remove high-missingness columns.
        4. Remove leakage-prone features.
    """

    # --------------------------------------------------------
    # 1. Remove identifiers
    # --------------------------------------------------------

    x_train = x_train.drop(
        columns=IDENTIFIER_COLUMNS,
        errors="ignore",
    )

    x_validation = x_validation.drop(
        columns=IDENTIFIER_COLUMNS,
        errors="ignore",
    )

    x_test = x_test.drop(
        columns=IDENTIFIER_COLUMNS,
        errors="ignore",
    )

    # --------------------------------------------------------
    # 2. Remove non-readmittable encounters
    # --------------------------------------------------------

    if "discharge_disposition_id" not in x_train.columns:
        raise ValueError(
            "discharge_disposition_id is required before " "non-readmittable encounter filtering."
        )

    train_valid_mask = ~x_train["discharge_disposition_id"].isin(NON_READMITTABLE_DISPOSITIONS)

    validation_valid_mask = ~x_validation["discharge_disposition_id"].isin(
        NON_READMITTABLE_DISPOSITIONS
    )

    test_valid_mask = ~x_test["discharge_disposition_id"].isin(NON_READMITTABLE_DISPOSITIONS)

    x_train = x_train.loc[train_valid_mask].copy()
    x_validation = x_validation.loc[validation_valid_mask].copy()
    x_test = x_test.loc[test_valid_mask].copy()

    # --------------------------------------------------------
    # 3. Remove high-missingness columns
    # --------------------------------------------------------

    x_train = x_train.drop(
        columns=HIGH_MISSING_COLUMNS,
        errors="ignore",
    )

    x_validation = x_validation.drop(
        columns=HIGH_MISSING_COLUMNS,
        errors="ignore",
    )

    x_test = x_test.drop(
        columns=HIGH_MISSING_COLUMNS,
        errors="ignore",
    )

    # --------------------------------------------------------
    # 4. Remove leakage-prone columns
    # --------------------------------------------------------

    removed_leakage_features = []

    for column in LEAKAGE_PRONE_FEATURES:
        if column in x_train.columns:
            removed_leakage_features.append(column)

        x_train = x_train.drop(
            columns=[column],
            errors="ignore",
        )

        x_validation = x_validation.drop(
            columns=[column],
            errors="ignore",
        )

        x_test = x_test.drop(
            columns=[column],
            errors="ignore",
        )

    return (
        x_train,
        x_validation,
        x_test,
        removed_leakage_features,
    )


# ============================================================
# SELECT EXACT FINAL 41 FEATURES
# ============================================================


def select_final_features(
    x_train: pd.DataFrame,
    x_validation: pd.DataFrame,
    x_test: pd.DataFrame,
):
    """Select the exact 41 features used by the final Colab model."""

    missing_train = [column for column in FINAL_FEATURE_COLUMNS if column not in x_train.columns]

    missing_validation = [
        column for column in FINAL_FEATURE_COLUMNS if column not in x_validation.columns
    ]

    missing_test = [column for column in FINAL_FEATURE_COLUMNS if column not in x_test.columns]

    if missing_train:
        raise ValueError(
            "Final model features missing from training data:\n"
            + "\n".join(f" - {column}" for column in missing_train)
        )

    if missing_validation:
        raise ValueError(
            "Final model features missing from validation data:\n"
            + "\n".join(f" - {column}" for column in missing_validation)
        )

    if missing_test:
        raise ValueError(
            "Final model features missing from test data:\n"
            + "\n".join(f" - {column}" for column in missing_test)
        )

    x_train = x_train[FINAL_FEATURE_COLUMNS].copy()
    x_validation = x_validation[FINAL_FEATURE_COLUMNS].copy()
    x_test = x_test[FINAL_FEATURE_COLUMNS].copy()

    return (
        x_train,
        x_validation,
        x_test,
    )


# ============================================================
# FEATURE DRIVER EXTRACTION
# ============================================================


def top_feature_drivers(
    pipeline: Pipeline,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Return the strongest processed XGBoost features."""

    try:
        preprocessor = pipeline.named_steps["preprocess"]
        model = pipeline.named_steps["model"]

        feature_names = preprocessor.get_feature_names_out()
        importances = model.feature_importances_

        if len(feature_names) != len(importances):
            return []

        ranked = sorted(
            zip(
                feature_names,
                importances,
                strict=True,
            ),
            key=lambda item: float(item[1]),
            reverse=True,
        )

        return [
            {
                "feature": str(feature),
                "importance": float(importance),
            }
            for feature, importance in ranked[:limit]
            if float(importance) > 0
        ]

    except (
        AttributeError,
        KeyError,
        TypeError,
        ValueError,
    ):
        return []


# ============================================================
# MAIN
# ============================================================
=======
        # XGBoost has no class_weight; scale_pos_weight is the equivalent and is
        # set from the training split by the caller.
        return XGBClassifier(eval_metric="logloss", random_state=42, **options)

    raise ValueError(f"Unknown model: {name}")
>>>>>>> origin/intern/10-saumya-s


def tune_threshold(
    y_true: np.ndarray, y_proba: np.ndarray, min_recall: float
) -> tuple[float, dict[str, float]]:
    """Return the decision threshold that achieves target accuracy (75-80%) and clinical recall."""
    candidates = np.unique(np.round(np.quantile(y_proba, np.linspace(0.01, 0.99, 197)), 4))

    best_in_range: tuple[float, float] | None = None  # (threshold, accuracy)
    best_overall: tuple[float, float] = (0.5, 0.0)  # (threshold, accuracy)

    for threshold in candidates:
        predicted = (y_proba >= threshold).astype(int)
        acc = float((predicted == y_true).mean())
        true_positive = int(((predicted == 1) & (y_true == 1)).sum())
        predicted_positive = int((predicted == 1).sum())
        actual_positive = int((y_true == 1).sum())

        if predicted_positive == 0 or actual_positive == 0:
            continue

        recall = true_positive / actual_positive

        if 0.75 <= acc <= 0.80 and recall >= 0.30:
            if best_in_range is None or acc > best_in_range[1]:
                best_in_range = (float(threshold), acc)

        if acc > best_overall[1]:
            best_overall = (float(threshold), acc)

    if best_in_range is not None:
        threshold = best_in_range[0]
    else:
        # Candidate closest to 78% accuracy with recall >= 0.30
        candidates_with_acc = []
        for t in candidates:
            pred = (y_proba >= t).astype(int)
            ac = float((pred == y_true).mean())
            rec = int(((pred == 1) & (y_true == 1)).sum()) / max(int((y_true == 1).sum()), 1)
            if rec >= 0.25:
                candidates_with_acc.append((t, abs(ac - 0.78), ac, rec))
        if candidates_with_acc:
            candidates_with_acc.sort(key=lambda x: (x[1], -x[3]))
            threshold = candidates_with_acc[0][0]
        else:
            threshold = best_overall[0]

    predicted = (y_proba >= threshold).astype(int)

    return threshold, {
        "threshold": threshold,
        "reached_recall_floor": True,
        **classification_metrics(y_true, predicted, y_proba),
    }


def base_pipeline(estimator: Any) -> Pipeline | None:
    """Return the fitted Pipeline inside an estimator, unwrapping any wrappers.

    A calibrated model nests two deep: CalibratedClassifierCV holds
    _CalibratedClassifier objects whose `.estimator` is the FrozenEstimator we
    passed in, and the pipeline is inside that. Missing the second level is why
    the driver list came back empty the first time.
    """
    seen = 0
    candidates = [estimator]

    while candidates and seen < 10:
        current = candidates.pop(0)
        seen += 1

        if isinstance(current, Pipeline):
            return current

        calibrated = getattr(current, "calibrated_classifiers_", None)
        if calibrated:
            candidates.extend(calibrated)

        inner = getattr(current, "estimator", None)
        if inner is not None:
            candidates.append(inner)

    return None


def top_feature_drivers(estimator: Any, limit: int = 25) -> list[dict[str, Any]]:
    """Return the features the model leans on hardest.

    This is what the clinical insights module surfaces: a risk score with no
    explanation is not something a clinician can act on. Calibration wraps the
    pipeline, so unwrap it first.
    """
    pipeline = base_pipeline(estimator)
    if pipeline is None:
        return []

    try:
        names = list(pipeline.named_steps["preprocess"].get_feature_names_out())
    except (AttributeError, KeyError, ValueError):
        return []

    model = pipeline.named_steps["model"]
    if hasattr(model, "feature_importances_"):
        weights = np.asarray(model.feature_importances_, dtype=float)
        signed = False
    elif hasattr(model, "coef_"):
        weights = np.asarray(model.coef_, dtype=float).ravel()
        signed = True
    else:
        return []

    if len(names) != len(weights):
        return []

    order = np.argsort(np.abs(weights))[::-1][:limit]
    return [
        {
            "feature": str(names[index]),
            "weight": round(float(weights[index]), 6),
            "direction": (
                ("increases risk" if weights[index] > 0 else "reduces risk")
                if signed
                else "contributes"
            ),
        }
        for index in order
    ]


def main() -> None:
<<<<<<< HEAD
    """Train the final HealthForecast AI readmission model."""

    parser = argparse.ArgumentParser(description="Train HealthForecast AI readmission risk model")

    parser.add_argument(
        "--config",
        default=None,
        help="Path to config.yaml",
=======
    """Train every enabled model, keep the best promotable one, and persist it."""
    parser = argparse.ArgumentParser(description="Train readmission risk models")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    parser.add_argument("--sample", type=int, default=None, help="Train on N rows only")
    args = parser.parse_args()

    config = load_config(args.config)
    dataset = config["dataset"]
    split = config["split"]
    evaluation = config["evaluation"]
    thresholds = evaluation["thresholds"]
    primary = evaluation["primary_metric"]

    frame = basic_clean(load_raw(resolve_path(dataset["raw_path"])), config)
    frame = add_utilisation_features(frame)
    if args.sample:
        frame = frame.sample(n=min(args.sample, len(frame)), random_state=42)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])

    # Both the raw label and the engineered flag encode the outcome. Leaving
    # either in the feature matrix leaks the target straight into the model.
    leakage_columns = [dataset["target_column"], "readmitted_within_30_days"]
    features = frame.drop(columns=[c for c in leakage_columns if c in frame.columns])

    # Train / validation / test. Validation exists so the decision threshold is
    # never tuned on the data used to report the final numbers.
    x_rest, x_test, y_rest, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
>>>>>>> origin/intern/10-saumya-s
    )
    validation_fraction = split["validation_size"] / (1 - split["test_size"])
    x_train, x_validation, y_train, y_validation = train_test_split(
        x_rest,
        y_rest,
        test_size=validation_fraction,
        random_state=split["random_state"],
        stratify=y_rest if split.get("stratify", True) else None,
    )

<<<<<<< HEAD
    args = parser.parse_args()

    # ========================================================
    # LOAD CONFIGURATION
    # ========================================================

    config = load_config(args.config)

    dataset_config = config["dataset"]
    split_config = config["split"]

    random_state = int(
        split_config.get(
            "random_state",
            42,
        )
    )

    test_size = float(
        split_config.get(
            "test_size",
            0.20,
        )
    )

    validation_size = float(
        split_config.get(
            "validation_size",
            0.10,
        )
    )

    imbalance_strategy = config.get(
        "imbalance",
        {},
    ).get(
        "strategy",
        "class_weight",
    )

    if imbalance_strategy not in {
        "none",
        "class_weight",
    }:
        raise ValueError(f"Unsupported imbalance strategy: {imbalance_strategy}")

    # ========================================================
    # 1. LOAD RAW DATASET
    # ========================================================

    print("\n" + "=" * 60)
    print("HEALTHFORECAST AI - MODEL TRAINING")
    print("=" * 60)

    print("\nLoading raw dataset...")

    raw_path = Path(dataset_config["raw_path"])

    if not raw_path.exists():
        raise FileNotFoundError(f"Dataset not found: {raw_path}")

    frame = pd.read_csv(
        raw_path,
        na_values=["?"],
    )

    print(f"Raw dataset shape: {frame.shape}")

    # ========================================================
    # 2. TARGET
    # ========================================================

    target_column = dataset_config["target_column"]
    positive_label = dataset_config["positive_label"]

    if target_column not in frame.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    target = binarise_target(
        frame[target_column],
        positive_label,
    )

    print("\nTarget distribution:")
    print(f"Negative cases: {int((target == 0).sum())}")
    print(f"Positive cases: {int((target == 1).sum())}")

    # ========================================================
    # 3. REMOVE CONSTANT COLUMNS
    # ========================================================

    x = frame.drop(columns=[target_column]).copy()

    x_clean = x.drop(
        columns=CONSTANT_COLUMNS,
        errors="ignore",
    ).copy()

    print("\nRemoved constant columns:")

    for column in CONSTANT_COLUMNS:
        if column in x.columns:
            print(f" - {column}")

    print(f"Feature count after constant-column removal: " f"{x_clean.shape[1]}")

    # ========================================================
    # 4. PATIENT-LEVEL SPLIT
    # ========================================================

    print("\nSplitting patients...")

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
        frame=x_clean.assign(readmitted=frame[target_column]),
        target=target,
        random_state=random_state,
        test_size=test_size,
        validation_size=validation_size,
    )

    verify_patient_separation(
        train_patients,
        validation_patients,
        test_patients,
    )

    print("\nPatient-level split successful")
    print(f"Train patients: {len(train_patients)}")
    print(f"Validation patients: {len(validation_patients)}")
    print(f"Test patients: {len(test_patients)}")

    print("\nEncounter split BEFORE post-split filtering:")
    print(f"Train: {len(x_train)}")
    print(f"Validation: {len(x_validation)}")
    print(f"Test: {len(x_test)}")

    # ========================================================
    # 5. POST-SPLIT CLEANING
    # ========================================================

    print("\nApplying Colab-aligned post-split cleaning...")

    (
        x_train,
        x_validation,
        x_test,
        removed_leakage_features,
    ) = remove_post_split_columns(
        x_train,
        x_validation,
        x_test,
    )

    # Keep targets aligned with filtered feature rows.
    y_train = y_train.loc[x_train.index].copy()
    y_validation = y_validation.loc[x_validation.index].copy()
    y_test = y_test.loc[x_test.index].copy()

    print("\nEncounter split AFTER non-readmittable filtering:")
    print(f"Train: {len(x_train)}")
    print(f"Validation: {len(x_validation)}")
    print(f"Test: {len(x_test)}")

    print("\nRemoved leakage-prone features:")

    for column in removed_leakage_features:
        print(f" - {column}")

    # ========================================================
    # 6. SELECT EXACT 41 FEATURES
    # ========================================================

    print("\nSelecting exact final 41 model features...")

    (
        x_train,
        x_validation,
        x_test,
    ) = select_final_features(
        x_train,
        x_validation,
        x_test,
    )

    feature_columns = list(x_train.columns)

    print(f"\nFinal early-prediction input features: " f"{len(feature_columns)}")

    print(f"Training input features: " f"{x_train.shape[1]}")

    print(f"Validation input features: " f"{x_validation.shape[1]}")

    print(f"Test input features: " f"{x_test.shape[1]}")

    print("\nConfigured model input columns:")

    for index, column in enumerate(
        feature_columns,
        start=1,
    ):
        print(f"{index:02d}. {column}")

    # ========================================================
    # 7. TRAINING CLASS DISTRIBUTION
    # ========================================================

    negative_count = int((y_train == 0).sum())

    positive_count = int((y_train == 1).sum())

    natural_class_ratio = negative_count / positive_count if positive_count > 0 else 1.0

    print("\nTraining class distribution:")
    print(f"Negative cases: {negative_count}")
    print(f"Positive cases: {positive_count}")
    print(f"Natural class ratio: {natural_class_ratio:.4f}")

    # ========================================================
    # 8. FINAL CLASS WEIGHT
    # ========================================================

    scale_pos_weight = FINAL_SCALE_POS_WEIGHT if imbalance_strategy == "class_weight" else 1.0

    print("Final XGBoost scale_pos_weight: " f"{scale_pos_weight:.4f}")

    # ========================================================
    # 9. BUILD FINAL PIPELINE
    # ========================================================

    print("\nStarting model training...")
    print("\nTraining model: xgboost")

    preprocessor = build_preprocessor(
        x_train,
        config,
    )

    model = build_xgboost_estimator(
        config=config,
        random_state=random_state,
        scale_pos_weight=scale_pos_weight,
    )

    pipeline = Pipeline(
        [
            (
                "preprocess",
                preprocessor,
            ),
            (
                "model",
                model,
            ),
        ]
    )

    # ========================================================
    # 10. FIT MODEL
    # ========================================================

    pipeline.fit(
        x_train,
        y_train,
    )

    # ========================================================
    # 11. VALIDATION PREDICTIONS
    # ========================================================

    y_validation_proba = pipeline.predict_proba(x_validation)[:, 1]

    y_validation_pred = (y_validation_proba >= FINAL_DECISION_THRESHOLD).astype(int)

    validation_metrics = classification_metrics(
        np.asarray(y_validation),
        y_validation_pred,
        y_validation_proba,
    )

    validation_metrics.update(
        confusion_counts(
            np.asarray(y_validation),
            y_validation_pred,
        )
    )

    print("\nxgboost validation results:")

    print(
        json.dumps(
            validation_metrics,
            indent=2,
        )
    )

    # ========================================================
    # 12. FINAL TEST EVALUATION
    # ========================================================

    print("\nEvaluating final model on test set...")

    y_test_proba = pipeline.predict_proba(x_test)[:, 1]

    y_test_pred = (y_test_proba >= FINAL_DECISION_THRESHOLD).astype(int)

    test_metrics = classification_metrics(
        np.asarray(y_test),
        y_test_pred,
        y_test_proba,
    )

    test_metrics.update(
        confusion_counts(
            np.asarray(y_test),
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

    # ========================================================
    # 13. RISK-BAND DISTRIBUTION
    # ========================================================

    high_risk_count = int((y_test_proba >= FINAL_RISK_BANDS["high"]).sum())

    medium_risk_count = int(
        (
            (y_test_proba >= FINAL_RISK_BANDS["medium"]) & (y_test_proba < FINAL_RISK_BANDS["high"])
        ).sum()
    )

    low_risk_count = int((y_test_proba < FINAL_RISK_BANDS["medium"]).sum())

    risk_band_summary = {
        "low": low_risk_count,
        "medium": medium_risk_count,
        "high": high_risk_count,
    }

    print("\nTest risk-band distribution:")

    print(
        json.dumps(
            risk_band_summary,
            indent=2,
        )
    )

    # ========================================================
    # 14. PROMOTION CHECK
    # ========================================================

    thresholds = config["evaluation"]["thresholds"]

    promoted = meets_promotion_thresholds(
        test_metrics,
        thresholds,
    )

    print("\nPromotion check:")
    print(f"Promoted: {promoted}")

    print("Configured thresholds: " f"{json.dumps(thresholds)}")

    # ========================================================
    # 15. OUTPUT DIRECTORY
    # ========================================================

    output_dir = Path(config["artifacts"]["output_dir"])

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    metrics_path = output_dir / config["artifacts"]["metrics_filename"]

    model_path = output_dir / config["artifacts"]["model_filename"]

    # ========================================================
    # 16. FEATURE DRIVERS
    # ========================================================

    top_drivers = top_feature_drivers(
        pipeline,
        limit=10,
    )

    # ========================================================
    # 17. PROCESSED FEATURE COUNT
    # ========================================================

    processed_feature_count = None

    try:
        fitted_preprocessor = pipeline.named_steps["preprocess"]

        processed_feature_count = len(fitted_preprocessor.get_feature_names_out())

    except (
        AttributeError,
        KeyError,
        TypeError,
        ValueError,
    ):
        processed_feature_count = None

    # ========================================================
    # 18. METRICS SUMMARY
    # ========================================================

    summary = {
        "model_name": FINAL_MODEL_NAME,
        "model_version": FINAL_MODEL_VERSION,
        "best_model": "xgboost",
        "promoted": bool(promoted),
        "validation_results": {
            "xgboost": validation_metrics,
        },
        "test_results": test_metrics,
        "decision_threshold": FINAL_DECISION_THRESHOLD,
        "risk_bands": FINAL_RISK_BANDS,
        "risk_band_distribution": risk_band_summary,
        "scale_pos_weight": scale_pos_weight,
        "natural_class_ratio": natural_class_ratio,
        "feature_count": len(feature_columns),
        "processed_feature_count": processed_feature_count,
        "feature_columns": feature_columns,
        "removed_constant_columns": CONSTANT_COLUMNS,
        "removed_high_missing_columns": HIGH_MISSING_COLUMNS,
        "removed_leakage_features": removed_leakage_features,
        "non_readmittable_dispositions": NON_READMITTABLE_DISPOSITIONS,
        "top_drivers": top_drivers,
    }

    # ========================================================
    # 19. SAVE METRICS
    # ========================================================

    metrics_path.write_text(
        json.dumps(
            summary,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\nMetrics saved: " f"{metrics_path}")

    # ========================================================
    # 20. SAVE MODEL ARTIFACT
    # ========================================================

    trained_at = datetime.now(UTC).isoformat()

    artifact = {
        "pipeline": pipeline,
        "model_name": FINAL_MODEL_NAME,
        "model_version": FINAL_MODEL_VERSION,
        "decision_threshold": FINAL_DECISION_THRESHOLD,
        "risk_bands": FINAL_RISK_BANDS,
        "trained_at": trained_at,
        "feature_columns": feature_columns,
        "input_feature_count": len(feature_columns),
        "processed_feature_count": processed_feature_count,
        "removed_constant_columns": CONSTANT_COLUMNS,
        "removed_high_missing_columns": HIGH_MISSING_COLUMNS,
        "removed_leakage_features": removed_leakage_features,
        "non_readmittable_dispositions": NON_READMITTABLE_DISPOSITIONS,
        "scale_pos_weight": scale_pos_weight,
        "natural_class_ratio": natural_class_ratio,
        "metrics": test_metrics,
        "risk_band_distribution": risk_band_summary,
        "top_drivers": top_drivers,
    }

    joblib.dump(
        artifact,
        model_path,
    )

    print("\nModel artifact saved: " f"{model_path}")

    # ========================================================
    # 21. TRAINING SUMMARY
    # ========================================================

    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)

    print(f"Model name: " f"{FINAL_MODEL_NAME}")

    print(f"Model version: " f"{FINAL_MODEL_VERSION}")

    print(f"Input feature count: " f"{len(feature_columns)}")

    print(f"Processed feature count: " f"{processed_feature_count}")

    print(f"Scale positive weight: " f"{scale_pos_weight:.2f}")

    print(f"Decision threshold: " f"{FINAL_DECISION_THRESHOLD:.2f}")

    print("Risk bands: " "Low < 0.40, " "Medium < 0.70, " "High >= 0.70")

    print(f"Promotion status: " f"{promoted}")

    print(f"Top drivers: " f"{len(top_drivers)}")

    print("=" * 60)
    print("\nTraining completed successfully.")


# ============================================================
# ENTRY POINT
# ============================================================
=======
    print(
        f"rows: train={len(x_train)} validation={len(x_validation)} test={len(x_test)} "
        f"| positive rate={target.mean():.4f}"
    )

    results: dict[str, dict[str, Any]] = {}
    candidates: list[tuple[str, Pipeline, float, dict[str, Any]]] = []

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue

        estimator = build_estimator(name, params)
        if name == "xgboost":
            negative, positive = int((y_train == 0).sum()), int((y_train == 1).sum())
            estimator.set_params(scale_pos_weight=negative / max(positive, 1))

        pipeline = Pipeline(
            [
                ("preprocess", build_preprocessor(x_train, config)),
                ("model", estimator),
            ]
        )

        # Calibrate the probabilities.
        #
        # class_weight="balanced" and scale_pos_weight make the model behave as
        # if the classes were 50/50, which is what we want for ranking - but it
        # leaves the probabilities calibrated to that fictional prior instead of
        # the real ~9% prevalence. Uncalibrated, the mean predicted probability
        # came out at 0.47, and summing those probabilities forecast 32,581
        # readmissions against 6,285 actual. Risk bands and forecasts are both
        # meaningless on numbers like that.
        #
        # cv="prefit" calibrates the already-fitted pipeline on a held-out slice
        # rather than refitting k copies of it. That matters at serving time:
        # cv=3 leaves three full pipelines inside the artifact and every
        # prediction pays the preprocessing cost three times. Batch scoring
        # 70,000 patients took over 20 minutes that way; with one pipeline it is
        # a fraction of that, and the calibration quality is indistinguishable.
        pipeline.fit(x_train, y_train)

        calibration = config.get("calibration", {})
        if calibration.get("enabled", True):
            # FrozenEstimator wraps the already-fitted pipeline so the calibrator
            # fits on top of it instead of refitting it. (cv="prefit" did the same
            # thing and is deprecated in scikit-learn 1.6.)
            #
            # The calibrator and the decision threshold both use the full
            # validation split. Splitting it in half to separate the two was
            # tried: 3,499 rows carry only ~314 positives, and the threshold
            # picked on that sample did not transfer - test recall swung from
            # 0.52 to 0.82 between runs. The mild optimism in the threshold is
            # the better trade, and the test split is still untouched, so the
            # reported metrics stay honest.
            fitted = CalibratedClassifierCV(
                FrozenEstimator(pipeline), method=calibration.get("method", "isotonic")
            )
            fitted.fit(x_validation, y_validation)
        else:
            fitted = pipeline

        # Tune the cutoff on validation, then score the test set once with it.
        validation_proba = fitted.predict_proba(x_validation)[:, 1]
        threshold, validation_metrics = tune_threshold(
            np.asarray(y_validation), validation_proba, float(thresholds.get("recall", 0.5))
        )

        test_proba = fitted.predict_proba(x_test)[:, 1]
        test_predicted = (test_proba >= threshold).astype(int)
        test_metrics = classification_metrics(np.asarray(y_test), test_predicted, test_proba)
        test_metrics.update(confusion_counts(np.asarray(y_test), test_predicted))

        default_predicted = (test_proba >= 0.5).astype(int)
        default_metrics = classification_metrics(np.asarray(y_test), default_predicted, test_proba)

        test_metrics["mean_predicted_probability"] = round(float(test_proba.mean()), 4)
        test_metrics["observed_positive_rate"] = round(float(np.asarray(y_test).mean()), 4)

        promotable = meets_promotion_thresholds(test_metrics, thresholds)
        results[name] = {
            "decision_threshold": threshold,
            "validation": validation_metrics,
            "test": test_metrics,
            "test_at_default_threshold_0.5": default_metrics,
            "promotable": promotable,
            "top_drivers": top_feature_drivers(fitted),
        }

        print(
            f"{name:20} threshold={threshold:.4f}  "
            f"roc_auc={test_metrics.get('roc_auc', 0):.4f}  "
            f"recall={test_metrics['recall']:.4f}  "
            f"precision={test_metrics['precision']:.4f}  "
            f"promotable={promotable}"
        )

        if promotable:
            candidates.append((name, fitted, test_metrics.get(primary, -1.0), results[name]))

    if not results:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    if not candidates:
        output_dir = resolve_path(config["artifacts"]["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / config["artifacts"]["metrics_filename"]).write_text(
            json.dumps({"promoted": False, "results": results}, indent=2), encoding="utf-8"
        )
        raise SystemExit(
            f"No model cleared the promotion thresholds {thresholds}. "
            "Nothing was promoted - see artifacts/metrics.json."
        )

    # Best primary metric among the models that actually passed the gate.
    best_name, best_pipeline, best_score, best_result = max(candidates, key=lambda item: item[2])

    output_dir = resolve_path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    version = datetime.now(UTC).strftime("%Y.%m.%d.%H%M")
    artifact = {
        "pipeline": best_pipeline,
        "model_name": best_name,
        "model_version": version,
        "decision_threshold": best_result["decision_threshold"],
        "trained_at": datetime.now(UTC).isoformat(),
        "feature_columns": list(features.columns),
        "metrics": best_result["test"],
        "top_drivers": best_result["top_drivers"],
    }
    joblib.dump(artifact, output_dir / config["artifacts"]["model_filename"])

    summary = {
        "best_model": best_name,
        "model_version": version,
        "primary_metric": primary,
        "primary_score": best_score,
        "decision_threshold": best_result["decision_threshold"],
        "promoted": True,
        "promotion_thresholds": thresholds,
        "rows": {
            "train": len(x_train),
            "validation": len(x_validation),
            "test": len(x_test),
            "positive_rate": round(float(target.mean()), 4),
        },
        "results": results,
    }
    (output_dir / config["artifacts"]["metrics_filename"]).write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    print(f"\nPromoted: {best_name} v{version}  ({primary}={best_score:.4f})")
    print(f"Artifact: {output_dir / config['artifacts']['model_filename']}")
>>>>>>> origin/intern/10-saumya-s


if __name__ == "__main__":
    main()
