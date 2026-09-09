"""Dataset loading for the Diabetes 130-US Hospitals dataset.

The raw CSV is NOT committed to git. Download it into ml/data/raw/ first:
see ml/data/README.md.
"""

from pathlib import Path

import pandas as pd


def load_raw(path: str | Path) -> pd.DataFrame:
    """Read the raw hospital admissions CSV.

    Missing values in this dataset are encoded as "?" rather than blanks.
    """
    csv_path = Path(path)

    if not csv_path.exists():
        raise FileNotFoundError(
            f"Raw dataset not found at {csv_path}. See ml/data/README.md for the "
            "download instructions - datasets are never committed to git."
        )

    return pd.read_csv(csv_path, na_values=["?"], low_memory=False)


def binarise_target(series: pd.Series, positive_label: str = "<30") -> pd.Series:
    """Convert the three-way readmitted column into a 30-day readmission flag.

    The brief targets readmission within 30 days, so ">30" and "NO" are both
    negative outcomes.
    """
    return (series.astype(str).str.strip() == positive_label).astype(int)


if __name__ == "__main__":
    dataset_path = "data/raw/diabetic_data.csv"

    df = load_raw(dataset_path)

    print("Dataset loaded successfully")
    print("Rows:", len(df))
    print("Columns:", len(df.columns))
    print("\nReadmitted target distribution:")
    print(df["readmitted"].value_counts())


# Test-Path data/raw/diabetic_data.csv
# python -m src.data.load_data
