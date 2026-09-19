"""Read-only access to the Milestone 3 analytics artefacts.

The backend calls these four functions instead of opening the JSON files
itself, so the file layout stays an ML-side concern. Nothing here writes,
retrains or recomputes anything - it reads two files and answers questions
about them.

The schema is frozen at v1.0 (see docs/ml-insights-contract.md). Every load
checks schema_version and raises rather than returning fields the caller may not
recognise: a silent shape change is the failure mode that would reach a
clinician as a wrong number on a screen.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ARTIFACTS_DIR = Path(__file__).resolve().parents[2] / "artifacts"
TREATMENT_FILENAME = "treatment_metrics.json"
IMPORTANCE_FILENAME = "feature_importance.json"

SUPPORTED_SCHEMA_VERSION = "1.0"
COHORT_TYPES = ("age", "gender", "race", "diagnosis")


class InsightsUnavailableError(Exception):
    """Raised when an artefact has not been generated yet."""


class SchemaVersionError(Exception):
    """Raised when an artefact's schema_version is not the one this loader reads."""


# Parsed files are kept here so repeated calls do not re-read from disk. The
# backend serves many requests against the same artefact, and these files only
# change when the pipeline is re-run.
_cache: dict[str, dict[str, Any]] = {}


def _load(filename: str) -> dict[str, Any]:
    """Read and cache one artefact, checking its schema version."""
    if filename in _cache:
        return _cache[filename]

    path = ARTIFACTS_DIR / filename
    if not path.exists():
        raise InsightsUnavailableError(
            f"{filename} has not been generated. Run "
            "python -m src.evaluation.treatment_report from ml/ first."
        )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise InsightsUnavailableError(f"{filename} is not readable JSON: {error}") from error

    version = data.get("schema_version")
    if version != SUPPORTED_SCHEMA_VERSION:
        raise SchemaVersionError(
            f"{filename} is schema_version {version!r}, this loader reads "
            f"{SUPPORTED_SCHEMA_VERSION!r}. Regenerate the artefact or update the loader."
        )

    _cache[filename] = data
    return data


def reset_cache() -> None:
    """Forget the parsed artefacts so the next call re-reads from disk."""
    _cache.clear()


def get_global_drivers(top_n: int = 10) -> list[dict[str, Any]]:
    """Return the strongest risk drivers across the explained sample, ranked.

    Each entry carries the column name, a human-readable label, its mean
    absolute SHAP value and a direction. Direction is "mixed" for categorical
    columns, which have no single high end - the backend should print the label
    without a direction arrow in that case rather than guessing one.
    """
    return _load(IMPORTANCE_FILENAME)["global_drivers"][:top_n]


def get_patient_drivers(encounter_id: int | str, top_n: int = 5) -> list[dict[str, Any]] | None:
    """Return one patient's strongest drivers, or None if they are not in the sample.

    None is not an error. feature_importance.json holds drivers for a sample of
    patients only, so a miss is the normal case for most encounters; the caller
    should fall back to the global drivers rather than showing an error.
    """
    drivers = _load(IMPORTANCE_FILENAME)["patient_drivers"].get(str(encounter_id))
    return drivers[:top_n] if drivers is not None else None


def get_treatment_summary() -> dict[str, Any]:
    """Return the recovery score summary and the treatment effectiveness tables.

    The limitations list is included on purpose. It travels with the numbers so
    an endpoint cannot present a rate difference as an effect without having the
    caveat in the same payload.
    """
    data = _load(TREATMENT_FILENAME)
    return {
        "schema_version": data["schema_version"],
        "generated_at": data["generated_at"],
        "population": data["population"],
        "recovery_score": data["recovery_score"],
        "treatment_effectiveness": data["treatment_effectiveness"],
        "model_evaluation": data["model_evaluation"],
        "limitations": data["limitations"],
    }


def get_cohort_metrics(cohort_type: str) -> list[dict[str, Any]]:
    """Return the cohort breakdown for one of age, gender, race or diagnosis.

    Rows with reliable=false came from fewer than the configured minimum number
    of patients. They are returned rather than hidden so the caller can grey them
    out; dropping them here would make a small cohort look like a cohort with no
    readmissions.
    """
    if cohort_type not in COHORT_TYPES:
        raise ValueError(
            f"Unknown cohort type {cohort_type!r}. Expected one of {', '.join(COHORT_TYPES)}."
        )
    return _load(TREATMENT_FILENAME)["cohorts"][cohort_type]
