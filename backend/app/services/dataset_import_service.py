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

from collections.abc import Callable, Iterator
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


@dataclass(frozen=True)
class RelationalDatasetProfile:
    """A multi-table export joined on its own keys before loading.

    ``tables`` maps each logical table (patients/admissions/diagnoses) onto its
    file name inside the export directory.
    """

    name: str
    tables: dict[str, str]
    unmapped_note: str = ""


# The dataset named in the approved architecture, verified against the real
# Kaggle files: a relational export joined patients -> admissions
# (patient_id) -> diagnoses (admission_id).
INDIA_HOSPITAL_READMISSION = RelationalDatasetProfile(
    name="india_hospital_readmission",
    tables={
        "patients": "patients.csv",
        "admissions": "admissions.csv",
        "diagnoses": "diagnoses.csv",
    },
    unmapped_note=(
        "Fields with no column in the operational schema are not imported: "
        "patients.state/bpl_card/insurance_type/comorbidity_count/prev_admissions, "
        "admissions.ward_type/hospital_id/num_procedures/charlson_index and lab "
        "values, and the billing.csv/hospitals.csv tables. admissions.department "
        "stays empty because the export has no department (ward_type is a care "
        "unit, not a department). readmitted holds the export's 30-day flag as "
        "'<30' (1) or 'NO' (0); 'NO' means not readmitted within 30 days. Raise "
        "with the mentor before adding columns to the mentor-owned schema."
    ),
)

PROFILES: dict[str, DatasetProfile | RelationalDatasetProfile] = {
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
    patients_existing: int = 0
    admissions_existing: int = 0
    orphan_diagnoses: int = 0
    legacy_adopted: int = 0
    dry_run: bool = False
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
            "patients_existing": self.patients_existing,
            "admissions_existing": self.admissions_existing,
            "orphan_diagnoses": self.orphan_diagnoses,
            "legacy_adopted": self.legacy_adopted,
            "dry_run": self.dry_run,
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

        encounter = self.profile.encounter_key
        if encounter and encounter in row and _to_text(row.get(encounter), 40) is None:
            # The export carries encounter ids, so a blank one cannot be
            # matched on re-import - loading it would duplicate on every run.
            return "missing_encounter_identifier"

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
        identity = self._encounter_identity(frame)
        if identity == [self.profile.encounter_key]:
            # Blank encounter ids are not the same encounter: keep them out of
            # the duplicate check so validate_row rejects each one, instead of
            # collapsing them into one row that hides the others.
            blank = frame[identity[0]].isna()
            deduped = pd.concat(
                [frame[~blank].drop_duplicates(subset=identity), frame[blank]]
            ).sort_index()
        else:
            deduped = frame.drop_duplicates(subset=identity)
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
        """Load a dataframe and commit; see _load_frame."""
        return _in_transaction(self.db, lambda: self._load_frame(frame, limit), dry_run=False)

    def _load_frame(self, frame: pd.DataFrame, limit: int | None = None) -> ImportSummary:
        """Load a dataframe into patients and admissions.

        One row of the export is one encounter. Rows sharing a patient identifier
        collapse onto a single patient carrying many admissions, which is what
        makes prior-admission history available to the Milestone 2 features.

        Existing patients are reused rather than duplicated. When the profile
        has an encounter key (Diabetes 130-US: encounter_id) it is stored as a
        namespaced source_admission_id, so re-running the import skips
        encounters already loaded instead of duplicating them. Exports without
        that column keep the original behaviour (every run adds its rows).
        """
        summary = ImportSummary(profile=self.profile.name)
        frame = self.clean(frame, summary)
        if limit is not None:
            frame = frame.head(limit)
        summary.rows_read = len(frame)

        records = [
            {str(key): value for key, value in raw.items()}
            for raw in frame.to_dict(orient="records")
        ]
        wanted = [sid for sid in (self._source_id(r) for r in records) if sid is not None]
        owner: dict[str, str] = {}
        for chunk in _chunks(wanted):
            for source_id, mrn in (
                self.db.query(Admission.source_admission_id, Patient.medical_record_number)
                .join(Patient, Patient.id == Admission.patient_id)
                .filter(Admission.source_admission_id.in_(chunk))
            ):
                owner[source_id] = mrn

        seen: dict[str, Patient] = {}
        for record in records:
            reason = self.validate_row(record)
            if reason is not None:
                summary.reject(reason)
                continue

            key = str(_to_text(record.get(self.profile.patient_key), 64))
            source_id = self._source_id(record)
            if source_id is not None and source_id in owner:
                if owner[source_id] == key:
                    summary.admissions_existing += 1
                else:
                    summary.reject("source_id_belongs_to_another_patient")
                continue

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

            self.db.add(
                Admission(
                    patient_id=patient.id,
                    source_admission_id=source_id,
                    **self._admission_values(record),
                )
            )
            if source_id is not None:
                owner[source_id] = key
            summary.admissions_created += 1

        self.db.flush()
        return summary

    def _source_id(self, record: dict[str, Any]) -> str | None:
        """Namespaced encounter id, e.g. "diabetes_130_us:12522", or None.

        The profile name prefix keeps ids from different exports from ever
        colliding in the one unique source_admission_id index.
        """
        encounter = self.profile.encounter_key
        if not encounter or encounter not in record:
            return None
        value = record.get(encounter)
        number = _to_int(value)
        token = str(number) if number is not None else _to_text(value, 40)
        return None if token is None else f"{self.profile.name}:{token}"

    def import_csv(
        self, path: str | Path, limit: int | None = None, dry_run: bool = False
    ) -> ImportSummary:
        """Read an export from disk and load it in one transaction.

        ``dry_run`` validates and maps every row, reports what would be
        created, then rolls back so nothing is written.
        """
        frame = read_csv(path)
        return _in_transaction(self.db, lambda: self._load_frame(frame, limit), dry_run)


def _in_transaction(db: Session, work: Callable[[], ImportSummary], dry_run: bool) -> ImportSummary:
    """Run an import as one unit: commit on success, roll back on any error.

    A dry run rolls back unconditionally, so it exercises every validation and
    mapping rule against the real database without leaving a trace.
    """
    try:
        summary = work()
        summary.dry_run = dry_run
        if dry_run:
            db.rollback()
        else:
            db.commit()
        return summary
    except Exception:
        db.rollback()
        raise


_RELATIONAL_COLUMNS = {
    "patients": ["patient_id", "age", "gender"],
    "admissions": [
        "admission_id",
        "patient_id",
        "admit_date",
        "discharge_date",
        "los_days",
        "admit_type",
        "discharge_type",
        "readmitted_30d",
    ],
    "diagnoses": ["admission_id", "diag_desc", "diag_rank"],
}


# Rows per IN (...) lookup - well under every driver's bind-parameter limit.
_LOOKUP_CHUNK = 1000


def _chunks(values: list[Any], size: int = _LOOKUP_CHUNK) -> Iterator[list[Any]]:
    for start in range(0, len(values), size):
        yield values[start : start + size]


def _admission_key(values: dict[str, Any]) -> tuple[Any, ...]:
    """Natural identity of an admission, used only to adopt legacy rows.

    Admissions imported before migration 0005 have no source id; an incoming
    admission adopts the legacy row of the same patient whose mapped tuple
    matches exactly - verified unique across all 120,000 admissions in the
    real export (patient + dates alone collide once).
    """
    return (
        values["admission_date"],
        values["discharge_date"],
        values["time_in_hospital"],
        values["admission_type"],
        values["discharge_disposition"],
    )


class RelationalDatasetImportService:
    """Loads a relational export (patients/admissions/diagnoses) into Postgres.

    Idempotent: patients are matched on medical_record_number (the source
    patient_id) and never modified; admissions are matched exactly on
    source_admission_id (the source admission_id). Rows imported before
    source ids existed are adopted - their NULL source id is filled in - when
    they match on the full natural key, so re-running never duplicates them.
    Lookups are batched, so cost grows with the batch size, not per row.
    """

    def __init__(self, db: Session, profile: RelationalDatasetProfile) -> None:
        self.db = db
        self.profile = profile

    def import_export(
        self, raw_dir: str | Path, patient_limit: int | None, dry_run: bool = False
    ) -> ImportSummary:
        """Read the export's tables from ``raw_dir`` and load them."""
        directory = Path(raw_dir)
        frames = {name: read_csv(directory / file) for name, file in self.profile.tables.items()}
        return self.import_frames(
            frames["patients"],
            frames["admissions"],
            frames["diagnoses"],
            patient_limit=patient_limit,
            dry_run=dry_run,
        )

    def import_frames(
        self,
        patients: pd.DataFrame,
        admissions: pd.DataFrame,
        diagnoses: pd.DataFrame,
        patient_limit: int | None,
        dry_run: bool = False,
    ) -> ImportSummary:
        """Load already-read tables in one transaction.

        ``patient_limit`` selects the first N patients (in patients-table order)
        that have at least one admission and loads each with its full admission
        history; None loads every such patient.
        """
        for name, frame in (
            ("patients", patients),
            ("admissions", admissions),
            ("diagnoses", diagnoses),
        ):
            missing = [c for c in _RELATIONAL_COLUMNS[name] if c not in frame.columns]
            if missing:
                raise ValueError(f"{name} table is missing expected columns {missing}")
        if patient_limit is not None and patient_limit < 1:
            raise ValueError("patient_limit must be a positive number of patients")

        return _in_transaction(
            self.db,
            lambda: self._load(patients, admissions, diagnoses, patient_limit),
            dry_run,
        )

    def _load(
        self,
        patients: pd.DataFrame,
        admissions: pd.DataFrame,
        diagnoses: pd.DataFrame,
        patient_limit: int | None,
    ) -> ImportSummary:
        summary = ImportSummary(profile=self.profile.name)

        before = len(patients) + len(admissions)
        patients = patients.drop_duplicates(subset=["patient_id"])
        admissions = admissions.drop_duplicates(subset=["admission_id"])
        summary.duplicates_dropped = before - len(patients) - len(admissions)

        # Verified relationships: an admission must reference a known patient,
        # a diagnosis a known admission.
        known_patient = admissions["patient_id"].isin(patients["patient_id"])
        for _ in range(int((~known_patient).sum())):
            summary.reject("unknown_patient")
        admissions = admissions[known_patient]
        known_admission = diagnoses["admission_id"].isin(admissions["admission_id"])
        summary.orphan_diagnoses = int((~known_admission).sum())
        diagnoses = diagnoses[known_admission]

        primary = (
            diagnoses[diagnoses["diag_rank"] == 1]
            .drop_duplicates(subset=["admission_id"])
            .set_index("admission_id")["diag_desc"]
        )
        counts = diagnoses.groupby("admission_id").size()

        with_history = patients[patients["patient_id"].isin(admissions["patient_id"])]
        selected = with_history if patient_limit is None else with_history.head(patient_limit)
        chosen = admissions[admissions["patient_id"].isin(selected["patient_id"])].copy()
        chosen["_admit"] = pd.to_datetime(chosen["admit_date"], errors="coerce")
        chosen = chosen.sort_values("_admit", na_position="first", kind="stable")
        by_patient = dict(list(chosen.groupby("patient_id", sort=False)))

        # Phase 1 - validate and resolve patients (one lookup per chunk).
        accepted: list[tuple[str, dict[str, Any], pd.DataFrame]] = []
        for record in selected.to_dict(orient="records"):
            history = by_patient[record["patient_id"]]
            summary.rows_read += len(history)
            key = _to_text(record.get("patient_id"), 64)
            reason = self._patient_rejection(key, record)
            if reason is not None or key is None:
                for _ in range(len(history)):
                    summary.reject(reason or "missing_patient_identifier")
                continue
            accepted.append((key, record, history))

        keys = [key for key, _, _ in accepted]
        known: dict[str, Patient] = {}
        for chunk in _chunks(keys):
            for patient in self.db.query(Patient).filter(Patient.medical_record_number.in_(chunk)):
                known[patient.medical_record_number] = patient

        new_patients: list[Patient] = []
        for key, record, history in accepted:
            if key in known:
                summary.patients_existing += 1
                continue
            age = _age_to_int(record.get("age"))
            patient = Patient(
                medical_record_number=key,
                age_group=None if age is None else str(age),
                gender=_to_text(record.get("gender"), 16),
                primary_diagnosis=_to_text(primary.get(history.iloc[-1]["admission_id"]), 255),
            )
            known[key] = patient
            new_patients.append(patient)
        self.db.add_all(new_patients)
        self.db.flush()
        summary.patients_created = len(new_patients)

        # Phase 2 - existing admissions: exact source ids anywhere in the
        # table, plus legacy (NULL source id) rows of the patients involved.
        source_ids = [
            str(row["admission_id"])
            for _, _, history in accepted
            for row in history.to_dict("records")
        ]
        claimed: dict[str, int] = {}
        for chunk in _chunks(source_ids):
            for source_id, patient_id in self.db.query(
                Admission.source_admission_id, Admission.patient_id
            ).filter(Admission.source_admission_id.in_(chunk)):
                claimed[source_id] = patient_id

        existing_ids = [p.id for p in known.values() if p.id is not None]
        legacy: dict[tuple[Any, ...], list[Admission]] = {}
        for chunk in _chunks(existing_ids):
            for legacy_row in self.db.query(Admission).filter(
                Admission.patient_id.in_(chunk), Admission.source_admission_id.is_(None)
            ):
                natural = _admission_key(
                    {
                        "admission_date": legacy_row.admission_date,
                        "discharge_date": legacy_row.discharge_date,
                        "time_in_hospital": legacy_row.time_in_hospital,
                        "admission_type": legacy_row.admission_type,
                        "discharge_disposition": legacy_row.discharge_disposition,
                    }
                )
                legacy.setdefault((legacy_row.patient_id, *natural), []).append(legacy_row)

        # Phase 3 - insert, adopt, or skip each admission.
        new_admissions: list[Admission] = []
        for key, _, history in accepted:
            patient = known[key]
            for row in history.to_dict(orient="records"):
                values, rejection = self._admission_values(row, primary, counts)
                if rejection is not None:
                    summary.reject(rejection)
                    continue
                source_id = str(row["admission_id"])
                if source_id in claimed:
                    if claimed[source_id] != patient.id:
                        summary.reject("source_id_belongs_to_another_patient")
                    else:
                        summary.admissions_existing += 1
                    continue
                matches = legacy.get((patient.id, *_admission_key(values)))
                if matches:
                    matches.pop(0).source_admission_id = source_id
                    summary.legacy_adopted += 1
                else:
                    new_admissions.append(
                        Admission(patient_id=patient.id, source_admission_id=source_id, **values)
                    )
                claimed[source_id] = patient.id
        self.db.add_all(new_admissions)
        self.db.flush()
        summary.admissions_created = len(new_admissions)
        return summary

    @staticmethod
    def _patient_rejection(key: str | None, record: dict[str, Any]) -> str | None:
        if not key:
            return "missing_patient_identifier"
        age = _age_to_int(record.get("age"))
        if age is not None and not (MIN_AGE <= age <= MAX_AGE):
            return "implausible_age"
        return None

    @staticmethod
    def _admission_values(
        row: dict[str, Any], primary: pd.Series, counts: pd.Series
    ) -> tuple[dict[str, Any], str | None]:
        """Map one export admission onto the admissions table, or name why not."""
        admitted = _to_date(row.get("admit_date"))
        discharged = _to_date(row.get("discharge_date"))
        stay = _to_int(row.get("los_days"))
        flag = _to_int(row.get("readmitted_30d"))
        values = {
            "admission_date": admitted,
            "discharge_date": discharged,
            "time_in_hospital": stay,
            "admission_type": _to_text(row.get("admit_type"), 64),
            "discharge_disposition": _to_text(row.get("discharge_type"), 128),
            "number_diagnoses": _to_int(counts.get(row["admission_id"])),
            "readmitted": None if flag is None else ("<30" if flag == 1 else "NO"),
        }
        if admitted is not None and discharged is not None and discharged < admitted:
            return values, "discharge_before_admission"
        if stay is not None and stay < 0:
            return values, "negative_length_of_stay"
        return values, None
