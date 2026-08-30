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


def prepare_milestone1_data(
    csv_path: str = "ml/data/raw/diabetic_data.csv",
) -> pd.DataFrame:
    """Load raw data, select core features, clean, and binarise target."""
    df = load_raw(csv_path)

    selected_cols = [
        "encounter_id",
        "patient_nbr",
        "race",
        "gender",
        "age",
        "time_in_hospital",
        "num_lab_procedures",
        "num_procedures",
        "num_medications",
        "number_diagnoses",
        "readmitted",
    ]

    clean_df = df[selected_cols].dropna(subset=["gender", "race"]).copy()
    clean_df["readmitted_binary"] = binarise_target(clean_df["readmitted"])

    return clean_df.drop_duplicates()


if __name__ == "__main__":
    try:
        processed_data = prepare_milestone1_data()
        print("✅ Data successfully loaded using repo utilities!")
        print(f"Dataset Shape: {processed_data.shape}")
        print("\nFirst 5 rows:")
        print(processed_data.head())
    except FileNotFoundError as e:
        print(f"❌ {e}")
