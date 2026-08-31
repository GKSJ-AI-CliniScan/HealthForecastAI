"""Dataset Loading Script for Milestone 1.

Loads the Diabetes 130-US Hospitals dataset, verifies file integrity,
calculates basic dimensions and reports loading status.
"""

import sys
from pathlib import Path
import pandas as pd

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

DATASET_PATHS = [
    Path("dataset/raw/diabetic_data.csv"),
    Path("../dataset/raw/diabetic_data.csv"),
    Path("ml/data/raw/diabetic_data.csv"),
    Path("../ml/data/raw/diabetic_data.csv"),
]


def load_raw_dataset() -> pd.DataFrame:
    """Find and load diabetic_data.csv."""
    found_path = None
    for p in DATASET_PATHS:
        if p.exists() and p.is_file():
            found_path = p
            break

    if not found_path:
        print("[ERROR] Could not find diabetic_data.csv in expected dataset directories.")
        sys.exit(1)

    print(f"[*] Loading raw dataset from: {found_path.resolve()}")
    df = pd.read_csv(found_path)
    print(f"[SUCCESS] Loaded {len(df):,} records with {len(df.columns)} columns.")
    return df


if __name__ == "__main__":
    df = load_raw_dataset()
    print("\nDataset Columns:")
    for idx, col in enumerate(df.columns, 1):
        print(f"  {idx:2d}. {col} ({df[col].dtype})")
