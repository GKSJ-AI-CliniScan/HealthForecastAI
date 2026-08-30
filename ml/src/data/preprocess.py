"""Cleaning and preprocessing steps shared by training and inference.

Adapted for the India Hospital Readmission Dataset (2015-2024), used instead
of the Diabetes 130-US Hospitals dataset named in the original brief - see
docs/06-milestones/milestone-1.md for the reasoning. Source tables:
  admissions.csv, patients.csv, diagnoses.csv, hospitals.csv, billing.csv
"""

from typing import Any

import pandas as pd


def load_raw_tables(raw_dir: str) -> dict[str, pd.DataFrame]:
    """Load the five source CSVs from the raw data directory."""
    names = ["admissions", "patients", "diagnoses", "hospitals", "billing"]
    return {name: pd.read_csv(f"{raw_dir}/{name}.csv") for name in names}


def merge_admission_features(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Join admissions with patient demographics and hospital metadata.

    diagnoses.csv is one-to-many per admission, so it is summarised (primary
    diagnosis category + diagnosis count) rather than joined row-for-row.
    """
    admissions = tables["admissions"]
    patients = tables["patients"]
    hospitals = tables["hospitals"]
    diagnoses = tables["diagnoses"]

    primary_diag = diagnoses[diagnoses["diag_rank"] == 1][["admission_id", "diag_category"]].rename(
        columns={"diag_category": "primary_diag_category"}
    )
    diag_count = diagnoses.groupby("admission_id").size().rename("diagnosis_count")

    merged = admissions.merge(patients, on="patient_id", how="left")
    merged = merged.merge(hospitals, on="hospital_id", how="left", suffixes=("", "_hospital"))
    merged = merged.merge(primary_diag, on="admission_id", how="left")
    merged = merged.merge(diag_count, on="admission_id", how="left")
    return merged


def fill_missing_insurance(frame: pd.DataFrame) -> pd.DataFrame:
    """insurance_type is the one column with real missing values - fill as 'Unknown'."""
    frame = frame.copy()
    if "insurance_type" in frame.columns:
        frame["insurance_type"] = frame["insurance_type"].fillna("Unknown")
    return frame


def bucket_age(frame: pd.DataFrame) -> pd.DataFrame:
    """Bucket raw patient age into four clinically meaningful groups."""
    frame = frame.copy()
    if "age" not in frame.columns:
        return frame

    def _bucket(age: float) -> str:
        if pd.isna(age):
            return "unknown"
        if age < 30:
            return "under_30"
        if age < 50:
            return "30_to_49"
        if age < 70:
            return "50_to_69"
        return "70_plus"

    frame["age_group"] = frame["age"].map(_bucket)
    return frame


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
    """Apply the configured cleaning steps to an already-merged admissions frame."""
    preprocessing = config.get("preprocessing", {})
    cleaned = fill_missing_insurance(frame)
    cleaned = drop_unused_columns(cleaned, preprocessing.get("drop_columns", []))
    cleaned = bucket_age(cleaned)
    return cleaned.drop_duplicates()
