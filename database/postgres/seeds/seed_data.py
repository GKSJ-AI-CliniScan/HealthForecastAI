"""Database seeding script to populate patients and admissions tables from processed ML data."""

import sys
from pathlib import Path

# Locate repository root
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import pandas as pd

from ml.src.data.load_data import prepare_milestone1_data


def generate_sql_seed(df: pd.DataFrame, output_path: Path):
    """Generate SQL INSERT statements for patients and admissions tables."""
    print("⏳ Processing cleaned data for SQL generation...")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Deduplicate Patients
    patients_df = df[["patient_nbr", "age", "gender", "race"]].drop_duplicates(
        subset=["patient_nbr"]
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("-- Seed data auto-generated from diabetic_data.csv\n\n")

        # Insert Unique Patients
        f.write("-- Populate Patients\n")
        for _, row in patients_df.iterrows():
            med_rec = str(row["patient_nbr"]).replace("'", "''")
            age = str(row["age"]).replace("'", "''")
            gender = str(row["gender"]).replace("'", "''")
            race_str = str(row["race"]).replace("'", "''")
            race_val = (
                f"'{race_str}'"
                if pd.notna(row["race"]) and str(row["race"]).strip() != ""
                else "NULL"
            )

            f.write(
                f"INSERT INTO patients (medical_record_number, age_group, gender, race) "
                f"VALUES ('{med_rec}', '{age}', '{gender}', {race_val}) "
                f"ON CONFLICT (medical_record_number) DO NOTHING;\n"
            )

        # Insert Admissions linked to Patient Medical Record Number
        f.write("\n-- Populate Admissions\n")
        for _, row in df.iterrows():
            med_rec = str(row["patient_nbr"]).replace("'", "''")
            time_hosp = (
                int(row["time_in_hospital"])
                if pd.notna(row["time_in_hospital"])
                else "NULL"
            )
            meds = (
                int(row["num_medications"])
                if pd.notna(row["num_medications"])
                else "NULL"
            )
            labs = (
                int(row["num_lab_procedures"])
                if pd.notna(row["num_lab_procedures"])
                else "NULL"
            )
            diags = (
                int(row["number_diagnoses"])
                if pd.notna(row["number_diagnoses"])
                else "NULL"
            )
            readmitted_val = str(row["readmitted"]).replace("'", "''")
            readmitted_str = (
                f"'{readmitted_val}'"
                if pd.notna(row["readmitted"])
                else "NULL"
            )

            f.write(
                f"INSERT INTO admissions (patient_id, time_in_hospital, num_medications, num_lab_procedures, number_diagnoses, readmitted) "
                f"SELECT id, {time_hosp}, {meds}, {labs}, {diags}, {readmitted_str} "
                f"FROM patients WHERE medical_record_number = '{med_rec}';\n"
            )

    print(f"✅ Generated complete seed file at: {output_path}")
    print(f"✅ Unique Patients SQL statements: {len(patients_df)}")
    print(f"✅ Admissions SQL statements: {len(df)}")


if __name__ == "__main__":
    raw_csv = REPO_ROOT / "ml" / "data" / "raw" / "diabetic_data.csv"
    seed_sql = REPO_ROOT / "database" / "postgres" / "seeds" / "01_seed_data.sql"

    if not raw_csv.exists():
        print(f"❌ Error: Cannot find raw dataset at {raw_csv}")
    else:
        print("⏳ Loading dataset via load_data pipeline...")
        cleaned_data = prepare_milestone1_data(str(raw_csv))
        generate_sql_seed(cleaned_data, seed_sql)
