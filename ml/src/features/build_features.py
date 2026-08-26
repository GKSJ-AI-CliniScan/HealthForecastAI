"""Feature engineering and preprocessing for readmission risk."""

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types


# Diabetes medication columns in the UCI Diabetes 130-US Hospitals dataset.
MEDICATION_COLUMNS = [
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
    "examide",
    "citoglipton",
    "insulin",
    "glyburide-metformin",
    "glipizide-metformin",
    "glimepiride-pioglitazone",
    "metformin-rosiglitazone",
    "metformin-pioglitazone",
]


def build_preprocessor(
    frame: pd.DataFrame,
    config: dict[str, Any],
) -> ColumnTransformer:
    """Build the preprocessing pipeline used during model training.

    The returned ColumnTransformer keeps training and inference consistent.
    The fitted preprocessing object is stored together with the trained model.
    """

    preprocessing = config.get("preprocessing", {})

    # Identify numeric and categorical features.
    numeric, categorical = split_feature_types(frame)

    # ---------------------------------------------------------
    # Numeric preprocessing
    # ---------------------------------------------------------
    numeric_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(
                strategy=preprocessing.get(
                    "numeric_imputation",
                    "median",
                )
            ),
        )
    ]

    # Scaling is configurable.
    if preprocessing.get("scale_numeric", True):
        numeric_steps.append(("scale", StandardScaler()))

    # ---------------------------------------------------------
    # Categorical preprocessing
    # ---------------------------------------------------------
    categorical_imputation = preprocessing.get(
        "categorical_imputation",
        "most_frequent",
    )

    categorical_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(
                strategy=categorical_imputation,
            ),
        ),
        (
            "encode",
            OneHotEncoder(
                handle_unknown="ignore",
                min_frequency=0.01,
            ),
        ),
    ]

    # ---------------------------------------------------------
    # Combine numeric and categorical pipelines
    # ---------------------------------------------------------
    return ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline(numeric_steps),
                numeric,
            ),
            (
                "categorical",
                Pipeline(categorical_steps),
                categorical,
            ),
        ],
        remainder="drop",
    )


def add_utilisation_features(
    frame: pd.DataFrame,
) -> pd.DataFrame:
    """Create healthcare utilization, diagnosis, and medication features.

    Features created:

    - prior_visits_total
    - diagnosis_count
    - medication_changed
    - diabetes_medication_active
    - active_medication_count
    - medication_up_count
    - medication_down_count
    """

    result = frame.copy()

    # =========================================================
    # 1. Previous hospital utilization
    # =========================================================
    utilisation_columns = [
        "number_outpatient",
        "number_emergency",
        "number_inpatient",
    ]

    existing_utilisation_columns = [
        column for column in utilisation_columns if column in result.columns
    ]

    if existing_utilisation_columns:
        result["prior_visits_total"] = result[existing_utilisation_columns].sum(axis=1)

    # =========================================================
    # 2. Diagnosis count
    # =========================================================
    diagnosis_columns = [
        "diag_1",
        "diag_2",
        "diag_3",
    ]

    existing_diagnosis_columns = [
        column for column in diagnosis_columns if column in result.columns
    ]

    if existing_diagnosis_columns:
        result["diagnosis_count"] = result[existing_diagnosis_columns].notna().sum(axis=1)

    # =========================================================
    # 3. Overall medication change
    # =========================================================
    if "change" in result.columns:
        result["medication_changed"] = (
            result["change"].astype(str).str.strip().str.upper().eq("CH").astype(int)
        )

    # =========================================================
    # 4. Diabetes medication active
    # =========================================================
    if "diabetesMed" in result.columns:
        result["diabetes_medication_active"] = (
            result["diabetesMed"].astype(str).str.strip().str.upper().eq("YES").astype(int)
        )

    # =========================================================
    # 5. Medication burden and medication changes
    # =========================================================
    existing_medication_columns = [
        column for column in MEDICATION_COLUMNS if column in result.columns
    ]

    if existing_medication_columns:

        # Number of diabetes medications currently active.
        #
        # "Steady", "Up", and "Down" all indicate that the
        # patient is taking/using that medication.
        result["active_medication_count"] = (
            result[existing_medication_columns].isin(["Steady", "Up", "Down"]).sum(axis=1)
        )

        # Number of medications whose dosage was increased.
        result["medication_up_count"] = result[existing_medication_columns].eq("Up").sum(axis=1)

        # Number of medications whose dosage was decreased.
        result["medication_down_count"] = result[existing_medication_columns].eq("Down").sum(axis=1)

    return result
