"""Load the Diabetes 130-US Hospitals dataset into PostgreSQL.

Reads the raw CSV, splits it into one patient row per person and one admission
row per encounter, and writes both. The dataset file itself is never committed:
download it into ml/data/raw/ first, see ml/data/README.md.

    python database/postgres/seeds/seed_from_dataset.py --limit 5000
    python database/postgres/seeds/seed_from_dataset.py            # full load

Re-running is safe: existing patients are matched on patient_nbr and existing
encounters on encounter_id, so nothing is duplicated.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPO_ROOT / "backend"
for path in (str(REPO_ROOT), str(BACKEND_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

from app.db.session import SessionLocal
from app.models.admission import Admission
from app.models.patient import Patient

DEFAULT_CSV = REPO_ROOT / "ml" / "data" / "raw" / "diabetic_data.csv"

# Missing values in this dataset are the literal string "?", not blanks.
MISSING_TOKENS = ["?", "Unknown/Invalid", ""]

# Columns copied straight from the CSV onto the Admission row.
ADMISSION_INT_COLUMNS = (
    "time_in_hospital",
    "num_medications",
    "num_lab_procedures",
    "num_procedures",
    "number_diagnoses",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "discharge_disposition_id",
)


def to_optional_int(value: object) -> int | None:
    """Return an int, or None when the source cell was missing."""
    if pd.isna(value):
        return None
    return int(value)


def to_optional_str(value: object) -> str | None:
    """Return a trimmed string, or None when the source cell was missing."""
    if pd.isna(value):
        return None
    return str(value).strip() or None


def read_dataset(csv_path: Path, limit: int | None) -> pd.DataFrame:
    """Read the raw CSV, mapping the '?' sentinel to proper nulls."""
    if not csv_path.exists():
        raise SystemExit(
            f"Dataset not found at {csv_path}.\n"
            "Download it into ml/data/raw/ first - see ml/data/README.md.\n"
            "Datasets are never committed to this repository."
        )
    frame = pd.read_csv(csv_path, keep_default_na=False, na_values=MISSING_TOKENS, low_memory=False)
    return frame.head(limit) if limit else frame


def upsert_patients(db: Session, frame: pd.DataFrame) -> dict[int, int]:
    """Insert one row per unique patient and return patient_nbr to id.

    Demographics are taken from each patient's earliest encounter, so repeated
    visits cannot overwrite them with later values.
    """
    first_rows = frame.sort_values("encounter_id").drop_duplicates("patient_nbr", keep="first")

    existing = {
        patient.patient_nbr: patient.id
        for patient in db.query(Patient).filter(Patient.patient_nbr.isnot(None)).all()
    }

    created = 0
    for row in first_rows.itertuples(index=False):
        patient_nbr = int(row.patient_nbr)
        if patient_nbr in existing:
            continue
        patient = Patient(
            medical_record_number=f"MRN{patient_nbr}",
            patient_nbr=patient_nbr,
            age_group=to_optional_str(row.age),
            gender=to_optional_str(row.gender),
            race=to_optional_str(row.race),
            primary_diagnosis=to_optional_str(row.diag_1),
        )
        db.add(patient)
        created += 1

    db.commit()
    print(f"    Patients: {created:,} inserted, {len(existing):,} already present")

    return {
        patient.patient_nbr: patient.id
        for patient in db.query(Patient).filter(Patient.patient_nbr.isnot(None)).all()
    }


def insert_admissions(db: Session, frame: pd.DataFrame, patient_ids: dict[int, int]) -> int:
    """Insert one row per encounter, skipping encounters already loaded."""
    already_loaded = {
        row[0]
        for row in db.query(Admission.encounter_id).filter(Admission.encounter_id.isnot(None))
    }

    batch: list[Admission] = []
    for row in frame.itertuples(index=False):
        encounter_id = int(row.encounter_id)
        if encounter_id in already_loaded:
            continue
        patient_id = patient_ids.get(int(row.patient_nbr))
        if patient_id is None:
            continue

        readmitted = to_optional_str(row.readmitted)
        values = {name: to_optional_int(getattr(row, name)) for name in ADMISSION_INT_COLUMNS}
        batch.append(
            Admission(
                patient_id=patient_id,
                encounter_id=encounter_id,
                admission_type=to_optional_str(row.admission_type_id),
                admission_source=to_optional_str(row.admission_source_id),
                medical_specialty=to_optional_str(row.medical_specialty),
                diag_1=to_optional_str(row.diag_1),
                diag_2=to_optional_str(row.diag_2),
                diag_3=to_optional_str(row.diag_3),
                readmitted=readmitted,
                readmitted_within_30=Admission.derive_readmitted_within_30(readmitted),
                **values,
            )
        )

        if len(batch) >= 2000:
            db.bulk_save_objects(batch)
            db.commit()
            batch.clear()

    if batch:
        db.bulk_save_objects(batch)
        db.commit()

    total = db.query(Admission).count()
    print(f"    Admissions in table: {total:,}")
    return total


def main() -> int:
    """Run the load and print a short summary."""
    parser = argparse.ArgumentParser(description="Seed PostgreSQL from the raw dataset.")
    parser.add_argument("--csv", default=str(DEFAULT_CSV), help="Path to diabetic_data.csv")
    parser.add_argument("--limit", type=int, default=None, help="Load only the first N rows")
    arguments = parser.parse_args()

    frame = read_dataset(Path(arguments.csv), arguments.limit)
    print(f"[1] Read {len(frame):,} encounters from {arguments.csv}")
    print(f"    Unique patients in file: {frame['patient_nbr'].nunique():,}")

    db = SessionLocal()
    try:
        print("[2] Loading patients")
        patient_ids = upsert_patients(db, frame)
        print("[3] Loading admissions")
        insert_admissions(db, frame, patient_ids)
    finally:
        db.close()

    print("[4] Done. The unique constraint on patient_nbr guarantees one row per patient,")
    print("    so a train/test split on patient_id cannot leak a patient across folds.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
