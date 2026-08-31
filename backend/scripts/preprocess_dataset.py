"""Dataset Preprocessing Foundation for Milestone 1.

Performs data cleaning, feature categorization, missing value imputation strategy,
and documents feature columns for future ML development phases without model training.
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_dataset import load_raw_dataset



def preprocess_foundation(df: pd.DataFrame) -> dict:
    """Preprocess dataset foundation for future ML milestones."""
    print("\n[*] Starting Preprocessing Pipeline Foundation...")
    total_raw = len(df)

    # 1. Clean missing value representations
    df_clean = df.replace("?", np.nan).copy()

    # 2. Identify high missing columns (> 50% missing)
    high_missing = [col for col in df_clean.columns if df_clean[col].isnull().mean() > 0.5]
    print(f"[*] Identified {len(high_missing)} high-missing columns (>50%): {high_missing}")

    # 3. Categorize feature columns
    clinical_features = [
        "time_in_hospital",
        "num_lab_procedures",
        "num_procedures",
        "num_medications",
        "number_outpatient",
        "number_emergency",
        "number_inpatient",
        "number_diagnoses",
    ]

    medication_features = [
        "metformin",
        "repaglinide",
        "nateglinide",
        "chlorpropamide",
        "glimepiride",
        "glipizide",
        "glyburide",
        "tolbutamide",
        "pioglitazone",
        "rosiglitazone",
        "acarbose",
        "miglitol",
        "insulin",
        "change",
        "diabetesMed",
    ]

    demographic_features = ["race", "gender", "age"]

    print(f"[*] Clinical Numerical Features : {len(clinical_features)}")
    print(f"[*] Medication Features         : {len(medication_features)}")
    print(f"[*] Demographic Features        : {len(demographic_features)}")

    # 4. Target encoding foundation documentation (<30 vs NO/>30)
    if "readmitted" in df_clean.columns:
        df_clean["readmitted_binary"] = (df_clean["readmitted"] == "<30").astype(int)
        early_readmit_rate = df_clean["readmitted_binary"].mean() * 100
        print(f"[*] Early 30-day Readmission Rate: {early_readmit_rate:.2f}%")

    print("[SUCCESS] Preprocessing foundation ready for downstream ML milestones.")
    return {
        "raw_count": total_raw,
        "clinical_features": clinical_features,
        "medication_features": medication_features,
        "demographic_features": demographic_features,
    }


if __name__ == "__main__":
    df = load_raw_dataset()
    preprocess_foundation(df)
