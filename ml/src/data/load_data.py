"""Dataset loading and target construction, shared by every dataset profile.

The raw CSV is NOT committed to git. Download it into ml/data/raw/ first: see
ml/data/README.md.
"""

import hashlib
from pathlib import Path
from typing import Any

import pandas as pd

from src.features.build_features import normalise_gender

# Columns the relational loader needs from each table of the India Hospital
# Readmission export (verified against the real Kaggle files, not fixtures).
_REQUIRED_COLUMNS = {
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
        "readmitted_7d",
    ],
    "diagnoses": ["admission_id", "diag_desc", "diag_rank"],
}


def file_fingerprint(path: Path) -> dict[str, Any]:
    """Row count and SHA-256 of a source file, recorded as training provenance."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    with path.open("rb") as handle:
        rows = max(sum(1 for _ in handle) - 1, 0)
    return {"file": path.name, "rows": rows, "sha256": digest.hexdigest()}


def load_relational_export(
    raw_dir: str | Path,
    tables: dict[str, str],
    na_values: list[str] | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Join the India Hospital Readmission export into one row per admission.

    patients (1) -> admissions (N) on patient_id; diagnoses (N per admission)
    reduced to the rank-1 description plus a diagnosis count. Output columns
    use the pipeline's names (admit_date -> admission_date, los_days ->
    length_of_stay, ...). The 30-day/7-day flags are the export's own labels:
    they are NOT recomputed from admission gaps, because the export does not
    contain the readmission encounters those flags describe (verified: only
    ~1% of admissions have a next admission within 30 days vs an 11.8%
    labelled rate).
    """
    directory = Path(raw_dir)
    frames: dict[str, pd.DataFrame] = {}
    provenance: dict[str, Any] = {"files": {}}
    for name in ("patients", "admissions", "diagnoses"):
        path = directory / tables[name]
        if not path.exists():
            raise FileNotFoundError(
                f"Missing {path}. Download the India Hospital Readmission export into "
                f"{directory} - see ml/data/README.md."
            )
        frame = pd.read_csv(path, na_values=na_values, keep_default_na=True, low_memory=False)
        missing = [c for c in _REQUIRED_COLUMNS[name] if c not in frame.columns]
        if missing:
            raise ValueError(f"{path.name} is missing expected columns {missing}")
        frames[name] = frame
        provenance["files"][name] = file_fingerprint(path)

    patients = frames["patients"][["patient_id", "age", "gender"]]
    admissions = frames["admissions"][_REQUIRED_COLUMNS["admissions"]]
    diagnoses = frames["diagnoses"]

    primary = diagnoses[diagnoses["diag_rank"] == 1].drop_duplicates("admission_id")
    primary = primary.set_index("admission_id")["diag_desc"].rename("diagnosis")
    counts = diagnoses.groupby("admission_id").size().rename("number_diagnoses")

    joined = admissions.merge(patients, on="patient_id", how="inner", validate="many_to_one")
    provenance["admissions_without_patient"] = len(admissions) - len(joined)
    joined = joined.join(primary, on="admission_id").join(counts, on="admission_id")
    joined = joined.rename(
        columns={
            "admit_date": "admission_date",
            "los_days": "length_of_stay",
            "admit_type": "admission_type",
        }
    )
    joined["gender"] = normalise_gender(joined["gender"])
    provenance["joined_admissions"] = len(joined)
    return joined, provenance


def load_raw(path: str | Path, na_values: list[str] | None = None) -> pd.DataFrame:
    """Read a raw hospital admissions export.

    ``na_values`` is profile-specific: the Diabetes 130-US export encodes
    missing values as "?" only, while the India Hospital Readmission export
    uses a wider set of missing-value tokens (mirrors
    backend/app/services/dataset_import_service.py's NA_TOKENS, so the ML
    pipeline and the Postgres importer treat the same cell as missing the
    same way). Defaults to "?" only when not given, matching the original
    Diabetes-only behaviour.
    """
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Raw dataset not found at {csv_path}. See ml/data/README.md for the "
            "download instructions - datasets are never committed to git."
        )
    tokens = na_values if na_values is not None else ["?"]
    return pd.read_csv(csv_path, na_values=tokens, keep_default_na=True, low_memory=False)


def binarise_readmission_target(series: pd.Series, positive_label: str = "<30") -> pd.Series:
    """Convert the three-way readmitted column into a 30-day readmission flag.

    The brief targets readmission within 30 days, so ">30" and "NO" are both
    negative outcomes. This is the label for the readmission forecasting
    model - see binarise_risk_target below for the separate, broader risk
    target.
    """
    return (series.astype(str).str.strip() == positive_label).astype(int)


def binarise_risk_target(series: pd.Series, negative_label: str = "NO") -> pd.Series:
    """Convert the readmitted column into a broader "any readmission" risk flag.

    Deliberately a different, wider signal than binarise_readmission_target:
    both "<30" and ">30" count as positive here, since the Patient Risk
    Intelligence model is meant to synthesise a holistic risk picture rather
    than forecast one specific horizon (HealthForecastAI_ML_Design.md section
    2, "Risk intelligence problem"). Neither dataset available to this
    pipeline carries a separate clinical deterioration/complication flag, so
    "was this patient readmitted at all" is the broadest honest adverse-
    outcome signal these exports support. This is a documented modelling
    decision, not a silently invented proxy - risk_category (Low/Medium/High)
    is derived later from this model's predicted probability, never from this
    binary label directly.
    """
    return (series.astype(str).str.strip() != negative_label).astype(int)
