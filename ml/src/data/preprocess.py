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


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply the configured cleaning steps.

    TODO(milestone-1): add domain specific cleaning - collapse rare diagnosis
    codes, bucket age ranges, and remove expired-patient discharge dispositions
    which cannot be readmitted and would otherwise leak into the target.
    """
    preprocessing = config.get("preprocessing", {})
    cleaned = drop_unused_columns(frame, preprocessing.get("drop_columns", []))
    return cleaned.drop_duplicates()
