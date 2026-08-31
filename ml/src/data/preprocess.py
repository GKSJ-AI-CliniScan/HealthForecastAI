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


def map_icd9_to_category(icd9_code: Any) -> str:
    """Map ICD-9 diagnostic codes to standardized clinical categories."""
    if not icd9_code or icd9_code == "?" or str(icd9_code).strip() == "":
        return "Missing/Unknown"

    code_str = str(icd9_code).strip()
    if code_str.startswith("V"):
        return "Supplementary (V-codes)"
    if code_str.startswith("E"):
        return "External Cause (E-codes)"

    try:
        numeric_val = float(code_str)
    except ValueError:
        return "Other Diagnoses"

    if 390 <= numeric_val <= 459 or numeric_val == 785:
        return "Circulatory (Cardiac/Vascular)"
    elif 460 <= numeric_val <= 519 or numeric_val == 786:
        return "Respiratory (Pulmonary)"
    elif 520 <= numeric_val <= 579 or numeric_val == 787:
        return "Digestive (Gastrointestinal)"
    elif 250 <= numeric_val < 251:
        return "Diabetes Mellitus"
    elif 800 <= numeric_val <= 999:
        return "Injury & Poisoning"
    elif 710 <= numeric_val <= 739:
        return "Musculoskeletal System"
    elif 580 <= numeric_val <= 629 or numeric_val == 788:
        return "Genitourinary (Renal/Kidney)"
    elif 140 <= numeric_val <= 239:
        return "Neoplasms (Oncology)"
    elif 240 <= numeric_val <= 279:
        return "Endocrine / Nutritional / Metabolic"
    return "Other Diagnoses"


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply the configured cleaning steps and domain-specific transformations."""
    preprocessing = config.get("preprocessing", {})
    cleaned = drop_unused_columns(frame, preprocessing.get("drop_columns", []))

    # Filter out expired patients (dispositions 11, 13, 14, 19, 20, 21 indicate hospice/expired)
    if "discharge_disposition_id" in cleaned.columns:
        cleaned = cleaned[~cleaned["discharge_disposition_id"].isin([11, 13, 14, 19, 20, 21])]

    # Map diagnosis codes to clinical categories if present
    for col in ["diag_1", "diag_2", "diag_3"]:
        if col in cleaned.columns:
            cleaned[col] = cleaned[col].apply(map_icd9_to_category)

    return cleaned.drop_duplicates()
