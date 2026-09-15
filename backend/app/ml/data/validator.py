"""Data validation for features and input payloads."""

from __future__ import annotations

import pandas as pd

# Core numeric clinical features
REQUIRED_NUMERICAL_COLS = [
    "time_in_hospital",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "number_diagnoses",
]

# Core categorical clinical features
REQUIRED_CATEGORICAL_COLS = [
    "gender",
    "age",
    "admission_type_id",
    "discharge_disposition_id",
    "admission_source_id",
    "max_glu_serum",
    "A1Cresult",
    "metformin",
    "glipizide",
    "glyburide",
    "insulin",
    "change",
    "diabetesMed",
]


def validate_feature_columns(df: pd.DataFrame) -> list[str]:
    """Validate that required baseline columns are present in DataFrame.

    Returns list of missing column names (empty if valid).
    """
    missing: list[str] = []
    for col in REQUIRED_NUMERICAL_COLS:
        if col not in df.columns:
            missing.append(col)
    return missing


def sanitize_input_row(data: dict) -> dict:
    """Sanitize and provide reasonable clinical defaults for single patient inference."""
    sanitized = data.copy()

    defaults = {
        "time_in_hospital": 3,
        "num_lab_procedures": 40,
        "num_procedures": 1,
        "num_medications": 15,
        "number_outpatient": 0,
        "number_emergency": 0,
        "number_inpatient": 0,
        "number_diagnoses": 5,
        "race": "Caucasian",
        "gender": "Female",
        "age": "[60-70)",
        "admission_type_id": 1,
        "discharge_disposition_id": 1,
        "admission_source_id": 7,
        "max_glu_serum": "None",
        "A1Cresult": "None",
        "metformin": "No",
        "glipizide": "No",
        "glyburide": "No",
        "insulin": "No",
        "change": "No",
        "diabetesMed": "No",
        "diag_1": "428",
        "diag_2": "250",
        "diag_3": "401",
    }

    for key, val in defaults.items():
        if key not in sanitized or sanitized[key] is None:
            sanitized[key] = val

    return sanitized
