"""Data loader for the 130-US Hospitals Diabetes Dataset."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def get_default_dataset_path() -> Path:
    """Find the dataset file path relative to repo root."""
    current_dir = Path(__file__).resolve().parent
    # Check parent paths for dataset/raw/diabetic_data.csv
    for p in [current_dir, *current_dir.parents]:
        candidate = p / "dataset" / "raw" / "diabetic_data.csv"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("diabetic_data.csv not found in dataset/raw/")


def load_raw_dataset(path: str | Path | None = None) -> pd.DataFrame:
    """Load the diabetic data CSV, replace '?' with NaN and clean initial fields.

    Parameters
    ----------
    path : str or Path, optional
        Custom path to the CSV file. If None, default location is used.

    Returns
    -------
    pd.DataFrame
        Raw dataset with standardized missing value representations.
    """
    if path is None:
        path = get_default_dataset_path()

    df = pd.read_csv(path, na_values=["?", "None", "Unknown/Invalid"], low_memory=False)
    return df


def prepare_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Prepares raw dataframe by creating 30-day readmission target and dropping non-feature IDs.

    Target definition:
    - Positive class (1): readmitted == '<30' (readmitted within 30 days of discharge)
    - Negative class (0): readmitted in ('>30', 'NO') (not readmitted or readmitted after 30 days)

    Parameters
    ----------
    df : pd.DataFrame
        Loaded raw diabetic dataframe.

    Returns
    -------
    tuple[pd.DataFrame, pd.Series]
        Feature dataframe X and binary target Series y.
    """
    df = df.copy()

    # Drop patient identifier columns that cause data leakage
    drop_cols = ["encounter_id", "patient_nbr"]
    # Drop columns with extreme missingness (>90%)
    if "weight" in df.columns:
        drop_cols.append("weight")
    if "payer_code" in df.columns:
        drop_cols.append("payer_code")

    # Target: 30-day readmission
    if "readmitted" not in df.columns:
        raise ValueError("Target column 'readmitted' missing from dataset.")

    y = (df["readmitted"] == "<30").astype(int)
    drop_cols.append("readmitted")

    # Filter columns that exist
    actual_drop = [c for c in drop_cols if c in df.columns]
    X = df.drop(columns=actual_drop)

    return X, y
