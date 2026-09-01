"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


DIAGNOSIS_COLUMNS = ["diag_1", "diag_2", "diag_3"]
EXPIRED_DISPOSITION_IDS = [11, 19, 20, 21]


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(
    frame: pd.DataFrame,
) -> tuple[list[str], list[str]]:
    """Return the numeric and categorical column names of a dataframe."""
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in frame.columns if column not in numeric]
    return numeric, categorical


def remove_expired_patients(frame: pd.DataFrame) -> pd.DataFrame:
    """Remove encounters where the patient expired and cannot be readmitted."""
    if "discharge_disposition_id" not in frame.columns:
        return frame

    return frame[~frame["discharge_disposition_id"].isin(EXPIRED_DISPOSITION_IDS)].copy()


def collapse_rare_diagnoses(frame: pd.DataFrame, max_frequency: int = 10) -> pd.DataFrame:
    """Collapse rarely occurring diagnosis codes into 'Other'."""
    cleaned = frame.copy()

    for column in DIAGNOSIS_COLUMNS:
        if column not in cleaned.columns:
            continue

        counts = cleaned[column].value_counts(dropna=True)
        rare_codes = counts[counts <= max_frequency].index

        cleaned[column] = cleaned[column].replace(rare_codes, "Other")

    return cleaned


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply the configured cleaning steps."""
    preprocessing = config.get("preprocessing", {})

    cleaned = frame.copy()

    # Treat the configured token as a missing value.
    missing_token = preprocessing.get("missing_value_token", "?")
    cleaned = cleaned.replace(missing_token, float("nan"))
    # Remove encounters that cannot be readmitted.
    cleaned = remove_expired_patients(cleaned)

    # Drop configured unused/high-missingness columns.
    cleaned = drop_unused_columns(
        cleaned,
        preprocessing.get("drop_columns", []),
    )

    # Collapse rare diagnosis codes.
    cleaned = collapse_rare_diagnoses(cleaned)

    # Remove duplicate rows.
    return cleaned.drop_duplicates()


def build_preprocessor(
    frame: pd.DataFrame,
    config: dict[str, Any],
) -> ColumnTransformer:
    """Build the reusable preprocessing pipeline for model features."""
    preprocessing = config.get("preprocessing", {})

    numeric, categorical = split_feature_types(frame)

    # Target column should not be treated as a feature
    target_column = config.get("dataset", {}).get("target_column", "readmitted")

    numeric = [column for column in numeric if column != target_column]
    categorical = [column for column in categorical if column != target_column]

    numeric_imputer = SimpleImputer(strategy=preprocessing.get("numeric_imputation", "median"))

    numeric_steps = [("imputer", numeric_imputer)]

    if preprocessing.get("scale_numeric", True):
        numeric_steps.append(("scaler", StandardScaler()))

    numeric_pipeline = Pipeline(numeric_steps)

    categorical_pipeline = Pipeline(
        [
            (
                "imputer",
                SimpleImputer(
                    strategy=preprocessing.get(
                        "categorical_imputation",
                        "most_frequent",
                    )
                ),
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
            ),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, numeric),
            ("categorical", categorical_pipeline, categorical),
        ],
        remainder="drop",
    )
