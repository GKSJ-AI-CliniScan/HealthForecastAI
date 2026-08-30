"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import pandas as pd


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return the numeric and categorical column names of a dataframe."""
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in frame.columns if column not in numeric]
    return numeric, categorical

def remove_expired_patients(frame: pd.DataFrame) -> pd.DataFrame:
    """Remove encounters where the patient expired and cannot be readmitted."""
    expired_disposition_ids = [11, 19, 20, 21]

    if "discharge_disposition_id" not in frame.columns:
        return frame

    return frame[
        ~frame["discharge_disposition_id"].isin(expired_disposition_ids)
    ].copy()

def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply the configured cleaning steps."""
    preprocessing = config.get("preprocessing", {})

    cleaned = remove_expired_patients(frame)

    cleaned = drop_unused_columns(
        cleaned,
        preprocessing.get("drop_columns", [])
    )

    return cleaned.drop_duplicates()
