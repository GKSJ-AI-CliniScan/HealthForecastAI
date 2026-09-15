"""Feature engineering transformations for hospital readmission prediction."""

from __future__ import annotations

import pandas as pd


def map_icd9_category(code: str | float | int | None) -> str:
    """Map ICD-9 diagnosis code string to broad clinical diagnostic category."""
    if code is None or pd.isna(code):
        return "Missing"
    s = str(code).strip()
    if not s or s in ("?", "None"):
        return "Missing"

    # E and V codes (External causes of injury / Supplemental)
    if s.startswith("V") or s.startswith("v"):
        return "Supplementary"
    if s.startswith("E") or s.startswith("e"):
        return "ExternalInjury"

    try:
        val = float(s)
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


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add engineered clinical features to the dataframe."""
    df = df.copy()

    # Total past healthcare system visits
    inpatient = df["number_inpatient"].fillna(0) if "number_inpatient" in df else 0
    emergency = df["number_emergency"].fillna(0) if "number_emergency" in df else 0
    outpatient = df["number_outpatient"].fillna(0) if "number_outpatient" in df else 0

    df["total_prior_visits"] = inpatient + emergency + outpatient
    df["prior_inpatient_ratio"] = inpatient / (df["total_prior_visits"] + 1.0)

    # Diagnosis ICD-9 categorizations
    if "diag_1" in df.columns:
        df["diag_1_category"] = df["diag_1"].apply(map_icd9_category)
    else:
        df["diag_1_category"] = "Other"

    # Medication change and diabetes med flags
    if "change" in df.columns:
        df["med_changed"] = (df["change"] == "Ch").astype(int)
    else:
        df["med_changed"] = 0

    if "diabetesMed" in df.columns:
        df["has_diabetes_med"] = (df["diabetesMed"] == "Yes").astype(int)
    else:
        df["has_diabetes_med"] = 0

    # Clean missing values in categorical fields to string 'Unknown'
    cat_cols = [
        "race",
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
        "diag_1_category",
    ]
    for c in cat_cols:
        if c in df.columns:
            df[c] = df[c].fillna("Unknown").astype(str)

    return df
