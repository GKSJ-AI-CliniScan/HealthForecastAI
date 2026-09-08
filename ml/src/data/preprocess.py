"""Data preprocessing utilities for the readmission risk model."""

from typing import Any
import numpy as np
import pandas as pd


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Drop non-predictive identifiers and clean invalid demographic values."""
    result = frame.copy()

    # Replace missing value token with NaN
    missing_token = config.get("preprocessing", {}).get("missing_value_token", "?")
    result = result.replace(missing_token, np.nan)

    # Drop non-predictive columns specified in config
    drop_cols = config.get("preprocessing", {}).get("drop_columns", [])
    existing_drops = [c for c in drop_cols if c in result.columns]
    result = result.drop(columns=existing_drops)

    # Remove invalid gender records if present
    if "gender" in result.columns:
        result = result[result["gender"] != "Unknown/Invalid"]

    return result.reset_index(drop=True)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Split columns into numeric and categorical feature lists."""
    numeric_cols = frame.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = frame.select_dtypes(exclude=[np.number]).columns.tolist()

    # Remove target column if present
    target_col = "readmitted"
    if target_col in numeric_cols:
        numeric_cols.remove(target_col)
    if target_col in categorical_cols:
        categorical_cols.remove(target_col)

    return numeric_cols, categorical_cols
