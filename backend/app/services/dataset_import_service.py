"""dataset import service - loads a hospital admissions export into PostgreSQL.

Keep API handlers thin: routers validate and authorise, services do the work.

The importer is profile driven rather than written against one dataset. The
project brief names the Diabetes 130-US export while the approved architecture
names the India Hospital Readmission export, and both must land in the same
patients and admissions tables. A profile maps source column names onto the
schema, so switching datasets is a configuration change, not a rewrite.

Validation follows the rules in the SRS: a discharge cannot precede its
admission, ages and stays must be plausible, and duplicate encounters are
collapsed. A row that fails is quarantined with a reason rather than dropped
silently, so the rejects can be reviewed instead of disappearing.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient

# Values every supported export uses for "missing".
NA_TOKENS = ["?", "", "NA", "N/A", "nan", "None", "Unknown/Invalid"]

MIN_AGE = 0
MAX_AGE = 130


@dataclass(frozen=True)
class DatasetProfile:
    """Maps one source export onto the patients and admissions schema.

    ``patient_key`` identifies the person across encounters and becomes the
    medical record number. Optional columns that a given export does not carry
    are reported rather than treated as an error, because the two supported
    datasets do not describe an encounter with the same fields.
    """

    name: str
    patient_key: str
    patient_columns: dict[str, str]
    admission_columns: dict[str, str]
    encounter_key: str | None = None
    unmapped_note: str = ""


# The dataset named in the original project brief and wired into ml/configs.
DIABETES_130_US = DatasetProfile(
    name="diabetes_130_us",
    patient_key="patient_nbr",
    encounter_key="encounter_id",
    patient_columns={
        "age": "age_group",
        "gender": "gender",
        "race": "race",
        "diag_1": "primary_diagnosis",
    },
    admission_columns={
        "time_in_hospital": "time_in_hospital",
        "admission_type_id": "admission_type",
        "discharge_disposition_id": "discharge_disposition",
        "num_medications": "num_medications",
        "num_lab_procedures": "num_lab_procedures",
        "number_diagnoses": "number_diagnoses",
        "readmitted": "readmitted",
    },
)

# The dataset named in the approved architecture. Column names follow the field
# list in HealthForecastAI_ML_Design.md section 3.1; any that the real export does
# not carry are reported by ImportSummary.missing_columns rather than failing.
INDIA_HOSPITAL_READMISSION = DatasetProfile(
    name="india_hospital_readmission",
    patient_key="patient_id",
    patient_columns={
        "age": "age_group",
        "gender": "gender",
        "diagnosis": "primary_diagnosis",
    },
    admission_columns={
        "admission_date": "admission_date",
        "discharge_date": "discharge_date",
        "length_of_stay": "time_in_hospital",
        "admission_type": "admission_type",
        "department": "discharge_disposition",
        "medication_count": "num_medications",
        "readmitted": "readmitted",
    },
    unmapped_note=(
        "This export carries a 'region' column with no counterpart in the "
        "patients table, so it is not imported. Raise with the mentor before "
        "adding a column to the mentor-owned reference schema."
    ),
)

PROFILES: dict[str, DatasetProfile] = {
    DIABETES_130_US.name: DIABETES_130_US,
    INDIA_HOSPITAL_READMISSION.name: INDIA_HOSPITAL_READMISSION,
}


@dataclass
class ImportSummary:
    """What an import run actually did."""

    profile: str
    rows_read: int = 0
    rows_rejected: int = 0
    duplicates_dropped: int = 0
    patients_created: int = 0
    admissions_created: int = 0
    missing_columns: list[str] = field(default_factory=list)
    rejection_reasons: dict[str, int] = field(default_factory=dict)

    def reject(self, reason: str) -> None:
        """Record one rejected row against a reason."""
        self.rows_rejected += 1
        self.rejection_reasons[reason] = self.rejection_reasons.get(reason, 0) + 1

    def as_dict(self) -> dict[str, Any]:
        """Return a serialisable view for logging or a milestone report."""
        return {
            "profile": self.profile,
            "rows_read": self.rows_read,
            "rows_rejected": self.rows_rejected,
            "duplicates_dropped": self.duplicates_dropped,
            "patients_created": self.patients_created,
            "admissions_created": self.admissions_created,
            "missing_columns": self.missing_columns,
            "rejection_reasons": self.rejection_reasons,
        }


def read_csv(path: str | Path) -> pd.DataFrame:
    """Read a raw export, treating every known missing-value token as null."""
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {csv_path}. See ml/data/README.md for the download "
            "instructions - datasets are never committed to git."
        )
    return pd.read_csv(csv_path, na_values=NA_TOKENS, keep_default_na=True, low_memory=False)


def _to_int(value: Any) -> int | None:
    """Coerce a cell to int, returning None when it is missing or not numeric."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_date(value: Any) -> Any:
    """Coerce a cell to a date, returning None when it is missing or unparseable."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    return None if pd.isna(parsed) else parsed.date()


def _to_text(value: Any, limit: int) -> str | None:
    """Coerce a cell to trimmed text within the column's length, or None."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text[:limit] if text else None


def _age_to_int(value: Any) -> int | None:
    """Extract a numeric age from either a plain number or a band like '[70-80)'."""
    numeric = _to_int(value)
    if numeric is not None:
        return numeric
    text = _to_text(value, 32)
    if not text:
        return None
    digits = "".join(char if char.isdigit() else " " for char in text).split()
    return int(digits[0]) if digits else None


class DatasetImportService:
    """Validates, cleans and loads a hospital export into PostgreSQL."""

    def __init__(self, db: Session, profile: DatasetProfile = DIABETES_130_US) -> None:
        self.db = db
        self.profile = profile

    # -- validation ------------------------------------------------------

    def validate_row(self, row: dict[str, Any]) -> str | None:
        """Return a rejection reason, or None when the row is usable.

        Implements the SRS dataset validation rules: a discharge may not precede
        its admission, and age and length of stay must be clinically plausible.
        """
        if not _to_text(row.get(self.profile.patient_key), 64):
            return "missing_patient_identifier"

        age = _age_to_int(row.get("age"))
        if age is not None and not (MIN_AGE <= age <= MAX_AGE):
            return "implausible_age"

        stay_column = next(
            (
                src
                for src, dest in self.profile.admission_columns.items()
                if dest == "time_in_hospital"
            ),
            None,
        )
        if stay_column is not None:
            stay = _to_int(row.get(stay_column))
            if stay is not None and stay < 0:
                return "negative_length_of_stay"

        admitted = _to_date(row.get("admission_date"))
        discharged = _to_date(row.get("discharge_date"))
        if admitted is not None and discharged is not None and discharged < admitted:
            return "discharge_before_admission"

        return None

    # -- cleaning --------------------------------------------------------

    def clean(self, frame: pd.DataFrame, summary: ImportSummary) -> pd.DataFrame:
        """Drop duplicate encounters and record which mapped columns are absent."""
        expected = (
            [self.profile.patient_key]
            + list(self.profile.patient_columns)
            + list(self.profile.admission_columns)
        )
        summary.missing_columns = [name for name in expected if name not in frame.columns]

        before = len(frame)
        deduped = frame.drop_duplicates(subset=self._encounter_identity(frame))
        summary.duplicates_dropped = before - len(deduped)
        return deduped

    def _encounter_identity(self, frame: pd.DataFrame) -> list[str] | None:
        """Return the columns that identify one encounter, or None for whole-row.

        This must never be the patient identifier alone. A patient with several
        encounters is the normal case in both exports, and deduplicating on the
        person would silently discard their admission history - which is exactly
        the prior-utilisation signal the readmission model depends on.
        """
        if self.profile.encounter_key and self.profile.encounter_key in frame.columns:
            return [self.profile.encounter_key]
        pair = [c for c in (self.profile.patient_key, "admission_date") if c in frame.columns]
        return pair if len(pair) == 2 else None

    # -- loading ---------------------------------------------------------

    def _patient_values(self, row: dict[str, Any]) -> dict[str, Any]:
        limits = {"age_group": 16, "gender": 16, "race": 64, "primary_diagnosis": 255}
        values: dict[str, Any] = {}
        for source, destination in self.profile.patient_columns.items():
            values[destination] = _to_text(row.get(source), limits.get(destination, 64))
        return values

    def _admission_values(self, row: dict[str, Any]) -> dict[str, Any]:
        integers = {
            "time_in_hospital",
            "num_medications",
            "num_lab_procedures",
            "number_diagnoses",
        }
        dates = {"admission_date", "discharge_date"}
        limits = {"admission_type": 64, "discharge_disposition": 128, "readmitted": 8}

        values: dict[str, Any] = {}
        for source, destination in self.profile.admission_columns.items():
            cell = row.get(source)
            if destination in integers:
                values[destination] = _to_int(cell)
            elif destination in dates:
                values[destination] = _to_date(cell)
            else:
                values[destination] = _to_text(cell, limits.get(destination, 64))
        return values

    def import_frame(self, frame: pd.DataFrame, limit: int | None = None) -> ImportSummary:
        """Load a dataframe into patients and admissions.

        One row of the export is one encounter. Rows sharing a patient identifier
        collapse onto a single patient carrying many admissions, which is what
        makes prior-admission history available to the Milestone 2 features.

        Existing patients are reused rather than duplicated, so re-running the
        import adds encounters instead of a second copy of every person.
        """
        summary = ImportSummary(profile=self.profile.name)
        frame = self.clean(frame, summary)
        if limit is not None:
            frame = frame.head(limit)
        summary.rows_read = len(frame)

        seen: dict[str, Patient] = {}
        for raw in frame.to_dict(orient="records"):
            record: dict[str, Any] = {str(key): value for key, value in raw.items()}
            reason = self.validate_row(record)
            if reason is not None:
                summary.reject(reason)
                continue

            key = str(_to_text(record.get(self.profile.patient_key), 64))
            patient = seen.get(key)
            if patient is None:
                patient = (
                    self.db.query(Patient).filter(Patient.medical_record_number == key).first()
                )
                if patient is None:
                    patient = Patient(medical_record_number=key, **self._patient_values(record))
                    self.db.add(patient)
                    self.db.flush()
                    summary.patients_created += 1
                seen[key] = patient

            self.db.add(Admission(patient_id=patient.id, **self._admission_values(record)))
            summary.admissions_created += 1

        self.db.commit()
        return summary

    def import_csv(self, path: str | Path, limit: int | None = None) -> ImportSummary:
        """Read an export from disk and load it."""
        return self.import_frame(read_csv(path), limit=limit)
