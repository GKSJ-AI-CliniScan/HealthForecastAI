import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src"))

from data.preprocess import basic_clean, load_raw_tables, merge_admission_features

tables = load_raw_tables("data/raw_india")
print("Loaded tables:")
for name, df in tables.items():
    print(f"  {name}: {df.shape}")

merged = merge_admission_features(tables)
print()
print("MERGED shape:", merged.shape)

config = {
    "preprocessing": {
        "drop_columns": ["admission_id", "patient_id", "admit_date", "discharge_date", "bill_id"]
    }
}
cleaned = basic_clean(merged, config)
print()
print("CLEANED shape:", cleaned.shape)
print("insurance_type nulls after fill:", cleaned["insurance_type"].isnull().sum())
print("age_group distribution:", cleaned["age_group"].value_counts().to_dict())
