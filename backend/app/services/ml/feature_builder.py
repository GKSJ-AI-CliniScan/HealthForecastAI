"""Assembles a model-ready feature row from Postgres.

The trained pipelines (ml/src/models/train.py) were fit on the India Hospital
Readmission export's RAW column shape - age, gender, diagnosis,
length_of_stay, admission_type, medication_count, plus the engineered
prior_admission_count/days_since_last_discharge - not on the Postgres
patients/admissions column names, which dataset_import_service.py renames on
the way in (age -> age_group, diagnosis -> primary_diagnosis, length_of_stay
-> time_in_hospital, medication_count -> num_medications). This module is the
one place that translation happens, and it imports add_history_features
directly from ml/src rather than re-deriving it, so a training-time change to
that function can never silently drift from what inference does with it.
"""

import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient

# backend/ and ml/ are sibling packages with separate requirements.txt; this
# mirrors the sys.path bridge scripts/import_dataset.py already uses to cross
# that boundary (there, backend importing from repo root; here, the reverse).
_ML_ROOT = Path(__file__).resolve().parents[4] / "ml"
if str(_ML_ROOT) not in sys.path:
    sys.path.insert(0, str(_ML_ROOT))

from src.features.build_features import add_history_features  # noqa: E402

# The exact column set and order the training pipeline's ColumnTransformer
# was fit against for the India profile (raw column names, post
# feature-engineering, pre drop_unused_columns) - see
# ml/configs/config.yaml's india_hospital_readmission profile and
# ml/src/models/train.py::train_one_target.
FEATURE_COLUMNS = [
    "age",
    "gender",
    "diagnosis",
    "length_of_stay",
    "admission_type",
    "medication_count",
    "prior_admission_count",
    "days_since_last_discharge",
]


class InsufficientPatientDataError(Exception):
    """Raised when a patient/admission lacks enough data to build a feature row."""

    def __init__(self, missing_fields: list[str]) -> None:
        self.missing_fields = missing_fields
        super().__init__(f"Missing fields required for inference: {missing_fields}")


def _parse_age(age_group: str | None) -> int | None:
    """Recover a numeric age from patients.age_group.

    dataset_import_service stores the India profile's raw numeric age as text
    in this column (its name is a leftover from the Diabetes 130-US profile,
    where the same column holds a band like "[70-80)" instead).
    """
    if age_group is None:
        return None
    try:
        return int(float(age_group))
    except ValueError:
        return None


class FeatureBuilder:
    """Builds a single-row feature dataframe for one patient or admission."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def _admission_history(self, patient_id: int) -> pd.DataFrame:
        """Return every admission for a patient, oldest first, in the raw
        column shape add_history_features expects."""
        stmt = (
            select(Admission)
            .where(Admission.patient_id == patient_id)
            .order_by(Admission.admission_date)
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return pd.DataFrame(
            [
                {
                    "admission_id": row.id,
                    "patient_id": patient_id,
                    "admission_date": row.admission_date,
                    "length_of_stay": row.time_in_hospital,
                    "admission_type": row.admission_type,
                    "medication_count": row.num_medications,
                }
                for row in rows
            ]
        )

    def build_for_patient(
        self, patient: Patient, admission: Admission | None = None
    ) -> pd.DataFrame:
        """Return the feature row for a risk score or a readmission forecast.

        ``admission=None`` scores the patient's most recent admission (a
        general risk score); passing a specific admission scores that
        encounter (a readmission forecast). Either way, prior_admission_count
        and days_since_last_discharge are computed from the patient's full
        history up to and including that row, via the same function training
        used - never re-derived here.
        """
        history = self._admission_history(patient.id)
        if history.empty:
            raise InsufficientPatientDataError(["admission_history"])

        engineered = add_history_features(history, "patient_id", "admission_date")

        if admission is not None:
            row = engineered[engineered["admission_id"] == admission.id]
            if row.empty:
                raise InsufficientPatientDataError(["admission"])
        else:
            row = engineered.sort_values("admission_date", na_position="first").iloc[
                [-1]
            ]

        age = _parse_age(patient.age_group)
        missing = [
            name
            for name, value in {
                "age": age,
                "gender": patient.gender,
                "diagnosis": patient.primary_diagnosis,
            }.items()
            if value is None
        ]
        if missing:
            raise InsufficientPatientDataError(missing)

        return pd.DataFrame(
            [
                {
                    "age": age,
                    "gender": patient.gender,
                    "diagnosis": patient.primary_diagnosis,
                    "length_of_stay": row["length_of_stay"].iloc[0],
                    "admission_type": row["admission_type"].iloc[0],
                    "medication_count": row["medication_count"].iloc[0],
                    "prior_admission_count": row["prior_admission_count"].iloc[0],
                    "days_since_last_discharge": row["days_since_last_discharge"].iloc[
                        0
                    ],
                }
            ],
            columns=FEATURE_COLUMNS,
        )
