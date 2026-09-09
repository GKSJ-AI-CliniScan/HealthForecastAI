"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import numpy as np
import pandas as pd


# Discharge dispositions representing death or hospice care.
# These encounters cannot represent a normal future readmission.
NON_READMITTABLE_DISPOSITIONS = {
    "11",
    "13",
    "14",
    "19",
    "20",
    "21",
}


# These columns contain numeric-looking IDs, but the IDs represent
# categories rather than continuous numeric measurements.
FORCE_CATEGORICAL_COLUMNS = {
    "admission_type_id",
    "discharge_disposition_id",
    "admission_source_id",
}


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(
    frame: pd.DataFrame,
) -> tuple[list[str], list[str]]:
    """Return numeric and categorical feature column names."""

    # Start with columns that pandas identifies as numeric.
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()

    # Move numeric-looking ID columns to the categorical group.
    categorical = [
        column
        for column in frame.columns
        if column not in numeric or column in FORCE_CATEGORICAL_COLUMNS
    ]

    numeric = [column for column in numeric if column not in FORCE_CATEGORICAL_COLUMNS]

    return numeric, categorical


def remove_non_readmittable(
    frame: pd.DataFrame,
) -> pd.DataFrame:
    """Remove encounters where a normal future readmission is not possible."""

    column = "discharge_disposition_id"

    if column not in frame.columns:
        return frame

    disposition = frame[column].astype(str).str.strip()

    return frame.loc[~disposition.isin(NON_READMITTABLE_DISPOSITIONS)].copy()


def clean_diagnosis_columns(
    frame: pd.DataFrame,
) -> pd.DataFrame:
    """Normalize diagnosis values for consistent categorical processing."""

    result = frame.copy()

    diagnosis_columns = [
        "diag_1",
        "diag_2",
        "diag_3",
    ]

    for column in diagnosis_columns:
        if column in result.columns:
            result[column] = (
                result[column]
                .replace(
                    {
                        "?": np.nan,
                        "nan": np.nan,
                    }
                )
                .astype(object)
            )

    return result


def basic_clean(
    frame: pd.DataFrame,
    config: dict[str, Any],
) -> pd.DataFrame:
    """Apply the configured data-cleaning steps."""

    preprocessing = config.get("preprocessing", {})

    # Remove configured identifiers and high-missingness columns.
    cleaned = drop_unused_columns(
        frame,
        preprocessing.get("drop_columns", []),
    )

    # Remove encounters where normal future readmission is not possible.
    cleaned = remove_non_readmittable(cleaned)

    # Normalize missing diagnosis values.
    cleaned = clean_diagnosis_columns(cleaned)

    # Remove completely duplicated records.
    return cleaned.drop_duplicates()


if __name__ == "__main__":
    from src.data.load_data import load_raw
    from src.utils.config import load_config

    dataset_path = "data/raw/diabetic_data.csv"
    config_path = "configs/config.yaml"

    df = load_raw(dataset_path)
    config = load_config(config_path)

    clean = basic_clean(df, config)

    print("Preprocessing completed successfully")
    print("Original shape:", df.shape)
    print("Processed shape:", clean.shape)
    print("Duplicates:", clean.duplicated().sum())
    print("Target preserved:", "readmitted" in clean.columns)

    numeric, categorical = split_feature_types(clean.drop(columns=["readmitted"]))

    print("\nNumeric features:")
    print(numeric)

    print("\nCategorical features:")
    print(categorical)
