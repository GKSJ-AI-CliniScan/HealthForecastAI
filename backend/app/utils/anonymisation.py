"""Helpers for producing researcher safe, de-identified records."""

import csv
import hashlib
import io
from collections.abc import Iterable
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from app.models.patient import Patient


class AnonymisedPatientFields(TypedDict):
    """Keyword-argument shape for app.schemas.patient.PatientAnonymised."""

    pseudo_id: str
    age_group: str | None
    gender: str | None
    primary_diagnosis: str | None


# 10-year bands. Generalising a specific age (or an already-banded string
# from a different source profile) into a wider bucket is what keeps a
# researcher-facing age field from re-identifying a patient in a small cohort.
_AGE_BAND_WIDTH = 10


def pseudonymise(identifier: str, salt: str) -> str:
    """Return a stable, non-reversible pseudonym for a direct identifier.

    Used before any record is exposed to the researcher role. The salt must come
    from configuration and must never be committed to the repository.
    """
    digest = hashlib.sha256(f"{salt}:{identifier}".encode()).hexdigest()
    return f"PT-{digest[:16].upper()}"


def generalise_age(age_group: str | None) -> str | None:
    """Return a 10-year age band, tolerant of two different source shapes.

    patients.age_group holds a raw numeric age as text for the India Hospital
    Readmission profile (e.g. "61") but an already-banded string for the
    Diabetes 130-US profile (e.g. "[70-80)"; dataset_import_service.py stores
    it verbatim). A value that is not a plain integer is assumed to already be
    a band and is returned unchanged rather than guessed at.
    """
    if age_group is None:
        return None
    try:
        age = int(age_group)
    except ValueError:
        return age_group
    band_start = (age // _AGE_BAND_WIDTH) * _AGE_BAND_WIDTH
    return f"{band_start}-{band_start + _AGE_BAND_WIDTH - 1}"


def anonymise_patient(patient: "Patient", salt: str) -> AnonymisedPatientFields:
    """Return a de-identified view of one patient for the Researcher role.

    Drops the medical record number entirely, replaces the primary key with a
    pseudonym, and generalises age - the same fields app.schemas.patient's
    existing PatientAnonymised schema expects.
    """
    return {
        "pseudo_id": pseudonymise(str(patient.id), salt),
        "age_group": generalise_age(patient.age_group),
        "gender": patient.gender,
        "primary_diagnosis": patient.primary_diagnosis,
    }


RESEARCH_CSV_COLUMNS = ("pseudo_id", "age_group", "gender", "primary_diagnosis")

# A cell starting with one of these is evaluated as a formula by Excel/Sheets
# (CSV injection). Free-text fields such as primary_diagnosis come from
# imported data, so they are neutralised with a leading apostrophe.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _csv_safe(value: str | None) -> str:
    if value is None:
        return ""
    return f"'{value}" if value.startswith(_FORMULA_PREFIXES) else value


def research_csv(records: Iterable[AnonymisedPatientFields]) -> str:
    """Render anonymised records as CSV. Only RESEARCH_CSV_COLUMNS are ever written."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(RESEARCH_CSV_COLUMNS)
    for record in records:
        values = (
            record["pseudo_id"],
            record["age_group"],
            record["gender"],
            record["primary_diagnosis"],
        )
        writer.writerow([_csv_safe(value) for value in values])
    return buffer.getvalue()
