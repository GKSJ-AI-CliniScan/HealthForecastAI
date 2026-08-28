"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import numpy as np
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


def collapse_icd9_diagnosis(code: Any) -> str:
    """Group ICD-9 diagnosis codes into clinical category buckets."""
    if pd.isna(code) or code == "?" or str(code).strip() == "":
        return "Other"

    code_str = str(code).strip()

    if code_str.startswith("V") or code_str.startswith("E"):
        return "Other"

    try:
        val = float(code_str)
    except ValueError:
        return "Other"

    if 390 <= val <= 459 or val == 785:
        return "Circulatory"
    if 460 <= val <= 519 or val == 786:
        return "Respiratory"
    if 520 <= val <= 579 or val == 787:
        return "Digestive"
    if 250 <= val < 251:
        return "Diabetes"
    if 800 <= val <= 999:
        return "Injury"
    if 710 <= val <= 739:
        return "Musculoskeletal"
    if 580 <= val <= 629 or val == 788:
        return "Genitourinary"
    if 140 <= val <= 239:
        return "Neoplasms"
    return "Other"


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply domain specific cleaning steps."""
    cleaned = frame.copy()

    if "discharge_disposition_id" in cleaned.columns:
        expired_ids = [11, 19, 20, 21]
        cleaned = cleaned[~cleaned["discharge_disposition_id"].isin(expired_ids)]

    preprocessing = config.get("preprocessing", {})
    drop_cols = preprocessing.get("drop_columns", [])
    cleaned = drop_unused_columns(cleaned, drop_cols)

    for diag_col in ["diag_1", "diag_2", "diag_3"]:
        if diag_col in cleaned.columns:
            cleaned[diag_col] = cleaned[diag_col].apply(collapse_icd9_diagnosis)

    cleaned = cleaned.replace("?", np.nan)
    return cleaned.drop_duplicates()
