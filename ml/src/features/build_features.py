"""Feature engineering and model preprocessing for readmission prediction."""

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types


def build_preprocessor(
    frame: pd.DataFrame,
    config: dict[str, Any],
) -> ColumnTransformer:
    """Build the preprocessing pipeline used during model training.

    Numeric features:
    - Missing values are replaced using median imputation.
    - Numeric features are optionally standardized.

    Categorical features:
    - Missing values are represented as a separate "Missing" category.
    - Categories are converted into numerical one-hot encoded features.

    The fitted preprocessing pipeline is stored together with the model
    so that training and prediction use the same transformations.
    """

    preprocessing = config.get("preprocessing", {})

    numeric, categorical = split_feature_types(frame)

    # Numeric preprocessing.
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

    if preprocessing.get("scale_numeric", True):
        numeric_steps.append(("scale", StandardScaler()))

    # Categorical preprocessing.
    # Missing values are kept as an explicit category.
    categorical_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(
                strategy="constant",
                fill_value="Missing",
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
    """Create clinically relevant features for readmission prediction."""

    result = frame.copy()

    # Total previous healthcare visits.
    utilisation_columns = [
        "number_outpatient",
        "number_emergency",
        "number_inpatient",
    ]

    if all(column in result.columns for column in utilisation_columns):
        result["prior_visits_total"] = (
            result["number_outpatient"] + result["number_emergency"] + result["number_inpatient"]
        )

        # Previous acute-care visits.
        result["prior_acute_visits"] = result["number_emergency"] + result["number_inpatient"]

        # Whether the patient had any previous visit.
        result["any_prior_visit"] = (result["prior_visits_total"] > 0).astype(int)

    # Medication change indicator.
    if "change" in result.columns:
        result["medication_change_flag"] = (
            result["change"].astype(str).str.strip().eq("Ch")
        ).astype(int)

    # Diabetes medication indicator.
    if "diabetesMed" in result.columns:
        result["diabetes_medication_flag"] = (
            result["diabetesMed"].astype(str).str.strip().eq("Yes")
        ).astype(int)

    return result
