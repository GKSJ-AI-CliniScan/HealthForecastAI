"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import pandas as pd


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return numeric and categorical feature column names.

    Dataset ID columns are treated as categorical because their numeric
    values are category codes, not continuous measurements.
    """
    categorical_id_columns = {
        "admission_type_id",
        "discharge_disposition_id",
        "admission_source_id",
    }

    numeric = [
        column
        for column in frame.select_dtypes(include=["number"]).columns
        if column not in categorical_id_columns
    ]

    categorical = [column for column in frame.columns if column not in numeric]

    return numeric, categorical


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply configured and domain-specific cleaning steps."""

    preprocessing = config.get("preprocessing", {})

    # 1. Drop identifiers and high-missingness columns configured in config.yaml
    cleaned = drop_unused_columns(frame, preprocessing.get("drop_columns", []))

    # 2. Remove records where the patient could not be readmitted
    expired_dispositions = [11, 13, 14, 19, 20, 21]

    if "discharge_disposition_id" in cleaned.columns:
        cleaned = cleaned[~cleaned["discharge_disposition_id"].isin(expired_dispositions)]

    # 3. Remove duplicate records
    cleaned = cleaned.drop_duplicates()

    return cleaned
