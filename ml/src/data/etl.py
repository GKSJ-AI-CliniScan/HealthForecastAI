"""ETL: load the Diabetes 130-US Hospitals dataset into PostgreSQL.

Milestone 1 - "Dataset integration and preprocessing completed".

Reads the raw CSV, runs the cleaning pipeline, then writes patients and
admissions in bulk. The dataset carries no direct identifiers: patient_nbr is
already a surrogate key, so the medical record number written here is derived
from it rather than being a real MRN.

Usage:
    python -m src.data.etl --limit 5000        # a quick subset
    python -m src.data.etl                     # the full dataset
    python -m src.data.etl --truncate          # clear the tables first
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from src.data.load_data import load_raw
from src.data.preprocess import basic_clean, summarise
from src.utils.config import load_config, resolve_path

DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/healthforecast"

PATIENT_COLUMNS = [
    "medical_record_number",
    "age_group",
    "gender",
    "race",
    "primary_diagnosis",
]

ADMISSION_COLUMNS = [
    "patient_id",
    "time_in_hospital",
    "admission_type",
    "discharge_disposition",
    "num_medications",
    "num_lab_procedures",
    "number_diagnoses",
    "readmitted",
]


def get_engine(database_url: str | None = None) -> Engine:
    """Return a SQLAlchemy engine for the target database."""
    url = database_url or os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL
    return create_engine(url, future=True)


def build_patient_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Project the cleaned dataset onto the patients table."""
    patients = pd.DataFrame(
        {
            "medical_record_number": "MRN-" + frame["patient_nbr"].astype(str),
            "age_group": frame.get("age_group"),
            "gender": frame.get("gender"),
            "race": frame.get("race"),
            "primary_diagnosis": frame.get("diag_1_group"),
        }
    )
    # "Unknown/Invalid" is the dataset's own placeholder, not a real value.
    patients["gender"] = patients["gender"].replace("Unknown/Invalid", None)
    return patients.where(pd.notna(patients), None)


def build_admission_frame(frame: pd.DataFrame, patient_ids: list[int]) -> pd.DataFrame:
    """Project the cleaned dataset onto the admissions table."""
    admissions = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "time_in_hospital": frame.get("time_in_hospital"),
            "admission_type": frame.get("admission_type"),
            "discharge_disposition": frame.get("discharge_disposition"),
            "num_medications": frame.get("num_medications"),
            "num_lab_procedures": frame.get("num_lab_procedures"),
            "number_diagnoses": frame.get("number_diagnoses"),
            "readmitted": frame.get("readmitted"),
        }
    )
    for column in (
        "time_in_hospital",
        "num_medications",
        "num_lab_procedures",
        "number_diagnoses",
    ):
        admissions[column] = pd.to_numeric(admissions[column], errors="coerce").astype("Int64")
    return admissions.where(pd.notna(admissions), None)


def truncate_clinical_tables(engine: Engine) -> None:
    """Remove every clinical row. Users and audit logs are left alone."""
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE risk_predictions, treatment_outcomes, admissions, patients "
                "RESTART IDENTITY CASCADE"
            )
        )


def insert_patients(engine: Engine, patients: pd.DataFrame, chunk_size: int) -> list[int]:
    """Insert patients in bulk and return their primary keys, in input order.

    Written as a batched INSERT followed by one lookup rather than a per-row
    INSERT ... RETURNING: at 70k patients the round trips dominate everything
    else, turning a twenty second load into twenty minutes.
    """
    statement = text(
        "INSERT INTO patients "
        "(medical_record_number, age_group, gender, race, primary_diagnosis) "
        "VALUES (:medical_record_number, :age_group, :gender, :race, :primary_diagnosis) "
        "ON CONFLICT (medical_record_number) DO NOTHING"
    )

    records = patients.to_dict(orient="records")
    with engine.begin() as connection:
        for start in range(0, len(records), chunk_size):
            connection.execute(statement, records[start : start + chunk_size])

    # One pass to resolve every generated id, then map back to the input order.
    with engine.connect() as connection:
        id_by_mrn = {
            mrn: pk
            for pk, mrn in connection.execute(
                text("SELECT id, medical_record_number FROM patients")
            )
        }

    return [id_by_mrn[mrn] for mrn in patients["medical_record_number"]]


def insert_admissions(engine: Engine, admissions: pd.DataFrame, chunk_size: int) -> int:
    """Insert admissions in chunks. Returns the number of rows written."""
    statement = text(
        "INSERT INTO admissions "
        "(patient_id, time_in_hospital, admission_type, discharge_disposition, "
        " num_medications, num_lab_procedures, number_diagnoses, readmitted) "
        "VALUES (:patient_id, :time_in_hospital, :admission_type, :discharge_disposition, "
        " :num_medications, :num_lab_procedures, :number_diagnoses, :readmitted)"
    )

    records = admissions.to_dict(orient="records")
    written = 0
    with engine.begin() as connection:
        for start in range(0, len(records), chunk_size):
            batch = records[start : start + chunk_size]
            connection.execute(statement, batch)
            written += len(batch)
    return written


def assign_patients_to_doctors(engine: Engine) -> int:
    """Spread patients across the doctors on the platform, round robin.

    Without this every doctor's caseload is empty and the "assigned patients
    only" scoping cannot be demonstrated.
    """
    with engine.begin() as connection:
        doctors = [
            row[0]
            for row in connection.execute(
                text("SELECT id FROM users WHERE role = 'doctor' ORDER BY id")
            )
        ]
        if not doctors:
            return 0

        connection.execute(
            text(
                "UPDATE patients SET assigned_doctor_id = doctor.id "
                "FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users "
                "      WHERE role = 'doctor') AS doctor "
                "WHERE ((patients.id - 1) % :n) + 1 = doctor.rn"
            ),
            {"n": len(doctors)},
        )
        return connection.execute(
            text("SELECT count(*) FROM patients WHERE assigned_doctor_id IS NOT NULL")
        ).scalar_one()


def run(
    limit: int | None = None,
    truncate: bool = False,
    chunk_size: int = 1000,
    database_url: str | None = None,
    config_path: str | None = None,
) -> dict[str, Any]:
    """Run the whole ETL and return a report."""
    config = load_config(config_path)
    dataset = config["dataset"]

    raw = load_raw(resolve_path(dataset["raw_path"]))
    report: dict[str, Any] = {"raw_rows": int(len(raw)), "raw_columns": int(raw.shape[1])}

    cleaned = basic_clean(raw, config, drop_columns=False)
    report["after_cleaning"] = summarise(cleaned)

    if limit:
        cleaned = cleaned.head(limit).copy()
        report["limited_to"] = int(len(cleaned))

    processed_path = resolve_path(dataset["processed_path"])
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        cleaned.to_parquet(processed_path, index=False)
        report["processed_path"] = str(processed_path)
    except (ImportError, ValueError) as exc:  # pyarrow missing - fall back to CSV
        fallback = processed_path.with_suffix(".csv")
        cleaned.to_csv(fallback, index=False)
        report["processed_path"] = str(fallback)
        report["parquet_note"] = f"parquet unavailable ({exc.__class__.__name__}), wrote CSV"

    engine = get_engine(database_url)
    if truncate:
        truncate_clinical_tables(engine)
        report["truncated"] = True

    patients = build_patient_frame(cleaned)
    patient_ids = insert_patients(engine, patients, chunk_size)
    report["patients_written"] = len(patient_ids)

    admissions = build_admission_frame(cleaned, patient_ids)
    report["admissions_written"] = insert_admissions(engine, admissions, chunk_size)
    report["patients_assigned_to_doctors"] = assign_patients_to_doctors(engine)

    return report


def main() -> None:
    """Command line entrypoint."""
    parser = argparse.ArgumentParser(description="Load the dataset into PostgreSQL")
    parser.add_argument("--limit", type=int, default=None, help="Load only the first N rows")
    parser.add_argument("--truncate", action="store_true", help="Clear clinical tables first")
    parser.add_argument("--chunk-size", type=int, default=1000, help="Rows per insert batch")
    parser.add_argument("--database-url", default=None, help="Override DATABASE_URL")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    args = parser.parse_args()

    try:
        report = run(
            limit=args.limit,
            truncate=args.truncate,
            chunk_size=args.chunk_size,
            database_url=args.database_url,
            config_path=args.config,
        )
    except FileNotFoundError as exc:
        print(f"ETL failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
