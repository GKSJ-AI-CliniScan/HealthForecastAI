"""ETL: load the Diabetes 130-US Hospitals dataset into PostgreSQL.

Milestone 1 loaded patients and admissions. Milestone 3 adds the diabetes care
indicators, prior utilisation, the source encounter id, and one treatment row per
admission and drug, which is what treatment effectiveness analysis runs on.

Reads the raw CSV, runs the cleaning pipeline, then writes in bulk. The dataset
carries no direct identifiers: patient_nbr is already a surrogate key, so the
medical record number written here is derived from it rather than being a real
MRN.

Usage:
    python -m src.data.etl --limit 5000        # a quick subset
    python -m src.data.etl --truncate          # clear the clinical tables, then load
    python -m src.data.etl                     # refuses if the tables already hold data
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from src.data.load_data import load_raw
from src.data.preprocess import basic_clean, summarise
from src.utils.config import load_config, resolve_path

DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/healthforecast"

# The 23 medication columns in the source. Each holds "No" (not given), "Steady"
# (given, dose unchanged), "Up" or "Down" (dose changed during the stay).
DRUG_COLUMNS = [
    "metformin",
    "repaglinide",
    "nateglinide",
    "chlorpropamide",
    "glimepiride",
    "acetohexamide",
    "glipizide",
    "glyburide",
    "tolbutamide",
    "pioglitazone",
    "rosiglitazone",
    "acarbose",
    "miglitol",
    "troglitazone",
    "tolazamide",
    "examide",
    "citoglipton",
    "insulin",
    "glyburide-metformin",
    "glipizide-metformin",
    "glimepiride-pioglitazone",
    "metformin-rosiglitazone",
    "metformin-pioglitazone",
]
GIVEN = ("Steady", "Up", "Down")

ADMISSION_INT_COLUMNS = (
    "time_in_hospital",
    "num_medications",
    "num_lab_procedures",
    "number_diagnoses",
    "number_inpatient",
    "number_emergency",
    "number_outpatient",
)


def get_engine(database_url: str | None = None) -> Engine:
    """Return a SQLAlchemy engine for the target database."""
    url = database_url or os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL
    return create_engine(url, future=True)


def _nullable(frame: pd.DataFrame) -> pd.DataFrame:
    """Replace every missing marker with None so the driver writes SQL NULL."""
    return frame.astype(object).where(pd.notna(frame), None)


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
    return _nullable(patients)


def build_admission_frame(frame: pd.DataFrame, patient_ids: list[int]) -> pd.DataFrame:
    """Project the cleaned dataset onto the admissions table."""
    admissions = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "source_encounter_id": frame.get("encounter_id"),
            "time_in_hospital": frame.get("time_in_hospital"),
            "admission_type": frame.get("admission_type"),
            "admission_source": frame.get("admission_source"),
            "department": frame.get("medical_specialty"),
            "discharge_disposition": frame.get("discharge_disposition"),
            "num_medications": frame.get("num_medications"),
            "num_lab_procedures": frame.get("num_lab_procedures"),
            "number_diagnoses": frame.get("number_diagnoses"),
            "number_inpatient": frame.get("number_inpatient"),
            "number_emergency": frame.get("number_emergency"),
            "number_outpatient": frame.get("number_outpatient"),
            # NaN here means the test was not performed. That is kept as NULL, not
            # filled in: "not tested" is the exposure the A1C analysis compares.
            "a1c_result": frame.get("A1Cresult"),
            "max_glu_serum": frame.get("max_glu_serum"),
            "diabetes_med": frame.get("diabetesMed").map({"Yes": True, "No": False}),
            "medication_changed": frame.get("change").map({"Ch": True, "No": False}),
            "readmitted": frame.get("readmitted"),
        }
    )

    # Identifiers are reset to a plain range first: `frame` keeps the index of the
    # cleaned dataset, and the patient ids were built positionally.
    admissions = admissions.reset_index(drop=True)
    for column in ADMISSION_INT_COLUMNS:
        admissions[column] = pd.to_numeric(admissions[column], errors="coerce").astype("Int64")
    admissions["source_encounter_id"] = pd.to_numeric(
        admissions["source_encounter_id"], errors="coerce"
    ).astype("Int64")

    return _nullable(admissions)


def build_treatment_frame(
    frame: pd.DataFrame, admission_id_by_encounter: dict[int, int]
) -> pd.DataFrame:
    """Return one row per admission and drug that was actually given.

    The wide source has a column per drug; this melts it long and keeps only the
    "Steady", "Up" and "Down" entries. "No" is not stored - no row means no drug.
    """
    present = [column for column in DRUG_COLUMNS if column in frame.columns]
    long = frame[["encounter_id", "time_in_hospital", "readmitted", *present]].melt(
        id_vars=["encounter_id", "time_in_hospital", "readmitted"],
        value_vars=present,
        var_name="treatment_name",
        value_name="dose_change",
    )
    long = long[long["dose_change"].isin(GIVEN)].copy()

    treatments = pd.DataFrame(
        {
            "admission_id": long["encounter_id"].map(admission_id_by_encounter),
            "treatment_name": long["treatment_name"],
            "dose_change": long["dose_change"],
            "medication_change": long["dose_change"].isin(("Up", "Down")),
            "length_of_stay_days": pd.to_numeric(long["time_in_hospital"], errors="coerce").astype(
                "Int64"
            ),
            "outcome": long["readmitted"].map(
                lambda value: "readmitted_30d" if value == "<30" else "not_readmitted_30d"
            ),
        }
    )
    treatments = treatments.dropna(subset=["admission_id"]).reset_index(drop=True)
    treatments["admission_id"] = treatments["admission_id"].astype(int)
    return _nullable(treatments)


def clinical_tables_are_empty(engine: Engine) -> bool:
    """True when there is nothing to duplicate."""
    with engine.connect() as connection:
        return connection.execute(text("SELECT count(*) FROM admissions")).scalar_one() == 0


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

    with engine.connect() as connection:
        id_by_mrn = {
            mrn: pk
            for pk, mrn in connection.execute(
                text("SELECT id, medical_record_number FROM patients")
            )
        }

    return [id_by_mrn[mrn] for mrn in patients["medical_record_number"]]


def _insert_rows(engine: Engine, table: str, frame: pd.DataFrame, chunk_size: int) -> int:
    """Bulk insert a frame into a table, using its own columns. Returns the row count."""
    columns = list(frame.columns)
    statement = text(
        f"INSERT INTO {table} ({', '.join(columns)}) "  # noqa: S608 - names come from our frame
        f"VALUES ({', '.join(':' + column for column in columns)})"
    )

    records = frame.to_dict(orient="records")
    written = 0
    with engine.begin() as connection:
        for start in range(0, len(records), chunk_size):
            batch = records[start : start + chunk_size]
            connection.execute(statement, batch)
            written += len(batch)
    return written


def insert_admissions(engine: Engine, admissions: pd.DataFrame, chunk_size: int) -> int:
    """Insert admissions in chunks. Returns the number of rows written."""
    return _insert_rows(engine, "admissions", admissions, chunk_size)


def insert_treatments(engine: Engine, treatments: pd.DataFrame, chunk_size: int) -> int:
    """Insert treatment rows in chunks. Returns the number of rows written."""
    return _insert_rows(engine, "treatment_outcomes", treatments, chunk_size)


def admission_ids_by_encounter(engine: Engine) -> dict[int, int]:
    """Map each source encounter id onto the admission row it became."""
    with engine.connect() as connection:
        return {
            int(encounter): int(pk)
            for pk, encounter in connection.execute(
                text(
                    "SELECT id, source_encounter_id FROM admissions WHERE source_encounter_id IS NOT NULL"
                )
            )
        }


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
    elif not clinical_tables_are_empty(engine):
        # Without this, a second run silently duplicated every admission.
        raise SystemExit(
            "The clinical tables already hold data. Re-run with --truncate to reload "
            "them, or the admissions would be duplicated."
        )

    patients = build_patient_frame(cleaned)
    patient_ids = insert_patients(engine, patients, chunk_size)
    report["patients_written"] = len(patient_ids)

    admissions = build_admission_frame(cleaned, patient_ids)
    report["admissions_written"] = insert_admissions(engine, admissions, chunk_size)

    treatments = build_treatment_frame(cleaned, admission_ids_by_encounter(engine))
    report["treatment_rows_written"] = insert_treatments(engine, treatments, chunk_size)
    report["treatment_rows_by_dose_change"] = {
        str(k): int(v) for k, v in treatments["dose_change"].value_counts().items()
    }

    report["patients_assigned_to_doctors"] = assign_patients_to_doctors(engine)
    return report


def main() -> None:
    """Command line entrypoint."""
    parser = argparse.ArgumentParser(description="Load the dataset into PostgreSQL")
    parser.add_argument("--limit", type=int, default=None, help="Load only the first N rows")
    parser.add_argument("--truncate", action="store_true", help="Clear clinical tables first")
    parser.add_argument("--chunk-size", type=int, default=2000, help="Rows per insert batch")
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
