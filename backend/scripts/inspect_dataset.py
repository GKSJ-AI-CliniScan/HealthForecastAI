"""Dataset Inspection Script for Milestone 1.

Inspects feature types, missing value percentages, distributions,
and target variable characteristics.
"""

import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_dataset import load_raw_dataset



def inspect_dataset(df: pd.DataFrame):
    """Analyze dataset structure and data quality."""
    print("\n" + "=" * 60)
    print("DIABETES 130-US HOSPITALS DATASET INSPECTION")
    print("=" * 60)

    total_rows, total_cols = df.shape
    print(f"Total Patient Encounters : {total_rows:,}")
    print(f"Total Features / Columns  : {total_cols}")

    # Missing values analysis ('?' or None)
    print("\n--- Missing Values Summary ---")
    missing_counts = {}
    for col in df.columns:
        cnt = (df[col] == "?").sum() + df[col].isnull().sum()
        if cnt > 0:
            pct = (cnt / total_rows) * 100
            missing_counts[col] = (cnt, pct)
            print(f"  {col:<28}: {cnt:>7,} ({pct:6.2f}%)")

    if not missing_counts:
        print("  No missing values detected.")

    # High-level category breakdowns
    print("\n--- Column Type Distribution ---")
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=["number"]).columns.tolist()
    print(f"  Numeric columns ({len(numeric_cols)})     : {', '.join(numeric_cols[:8])}...")
    print(f"  Categorical columns ({len(categorical_cols)}): {', '.join(categorical_cols[:8])}...")

    # Readmission Target Distribution (if present)
    if "readmitted" in df.columns:
        print("\n--- Target Variable Distribution ('readmitted') ---")
        readmitted_counts = df["readmitted"].value_counts()
        for label, count in readmitted_counts.items():
            pct = (count / total_rows) * 100
            print(f"  {label:<10}: {count:>7,} ({pct:6.2f}%)")

    print("\n[SUCCESS] Inspection completed.")


if __name__ == "__main__":
    df = load_raw_dataset()
    inspect_dataset(df)
