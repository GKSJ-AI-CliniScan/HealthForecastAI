"""Feature engineering for readmission risk."""

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types


def build_preprocessor(frame: pd.DataFrame, config: dict[str, Any]) -> ColumnTransformer:
    """Build the fitted-at-train-time preprocessing pipeline.

    Returning a ColumnTransformer (rather than transforming in place) keeps
    training and serving consistent - the same object is pickled with the model.
    """
    preprocessing = config.get("preprocessing", {})
    numeric, categorical = split_feature_types(frame)

    numeric_steps: list[tuple[str, Any]] = [
        ("impute", SimpleImputer(strategy=preprocessing.get("numeric_imputation", "median")))
    ]
    if preprocessing.get("scale_numeric", True):
        numeric_steps.append(("scale", StandardScaler()))

    categorical_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(strategy=preprocessing.get("categorical_imputation", "most_frequent")),
        ),
        ("encode", OneHotEncoder(handle_unknown="ignore", min_frequency=0.01)),
    ]

    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline(numeric_steps), numeric),
            ("categorical", Pipeline(categorical_steps), categorical),
        ],
        remainder="drop",
    )


def add_utilisation_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Derive prior-utilisation and clinical indicator features."""
    result = frame.copy()
    utilisation_columns = ["number_outpatient", "number_emergency", "number_inpatient"]
    if all(column in result.columns for column in utilisation_columns):
        result["prior_visits_total"] = result[utilisation_columns].sum(axis=1)

    if "change" in result.columns:
        result["medication_changed"] = (result["change"] == "Ch").astype(int)
    if "diabetesMed" in result.columns:
        result["diabetes_med_prescribed"] = (result["diabetesMed"] == "Yes").astype(int)

    return result
