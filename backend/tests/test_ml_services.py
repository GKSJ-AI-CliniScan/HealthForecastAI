"""Tests for the ML service layer: model registry, model loading, and feature
assembly - the pieces below the HTTP layer that test_risk_endpoints.py and
test_cds_endpoints.py exercise indirectly through the API.
"""

from datetime import UTC, datetime

import joblib
import pandas as pd
import pytest
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.model_metadata import ModelMetadata
from app.models.patient import Patient
from app.repositories.model_metadata_repository import ModelMetadataRepository
from app.services.ml import model_loader as model_loader_module
from app.services.ml.feature_builder import (
    FEATURE_COLUMNS,
    FeatureBuilder,
    InsufficientPatientDataError,
)
from app.services.ml.model_loader import ModelLoader, ModelNotAvailableError


@pytest.fixture(autouse=True)
def _clear_model_cache():
    model_loader_module.clear_cache()
    yield
    model_loader_module.clear_cache()


def _tiny_pipeline() -> Pipeline:
    """A real, fitted sklearn pipeline over FEATURE_COLUMNS - not a mock - so
    predict_proba() exercises the actual inference call path."""
    frame = pd.DataFrame(
        {
            "age": [30, 45, 60, 70, 25, 80],
            "gender": ["Female", "Male", "Female", "Male", "Female", "Male"],
            "diagnosis": [
                "Cardiac",
                "Diabetes",
                "Cardiac",
                "Renal",
                "Diabetes",
                "Cardiac",
            ],
            "length_of_stay": [2, 4, 6, 8, 1, 10],
            "admission_type": [
                "Elective",
                "Emergency",
                "Emergency",
                "Emergency",
                "Elective",
                "Emergency",
            ],
            "medication_count": [2, 5, 7, 9, 1, 10],
            "prior_admission_count": [0, 1, 2, 3, 0, 4],
            "days_since_last_discharge": [None, 100, 50, 20, None, 5],
        }
    )
    target = pd.Series([0, 0, 1, 1, 0, 1])
    numeric = [
        "age",
        "length_of_stay",
        "medication_count",
        "prior_admission_count",
        "days_since_last_discharge",
    ]
    categorical = ["gender", "diagnosis", "admission_type"]
    preprocessor = ColumnTransformer(
        [
            (
                "numeric",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="median")),
                        ("scale", StandardScaler()),
                    ]
                ),
                numeric,
            ),
            (
                "categorical",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        ("encode", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical,
            ),
        ]
    )
    pipeline = Pipeline([("preprocess", preprocessor), ("model", LogisticRegression())])
    pipeline.fit(frame[FEATURE_COLUMNS], target)
    return pipeline


def _register(
    db_session: Session, tmp_path, model_name: str, **overrides
) -> ModelMetadata:
    model_path = tmp_path / f"{model_name}-{overrides.get('version', 'v1')}.joblib"
    joblib.dump(_tiny_pipeline(), model_path)
    defaults = {
        "model_name": model_name,
        "version": "v1",
        "algorithm": "logistic_regression",
        "artifact_path": str(model_path),
        "status": "production",
        "trained_at": datetime.now(UTC),
        "promoted_at": datetime.now(UTC),
    }
    defaults.update(overrides)
    record = ModelMetadata(**defaults)
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


# --------------------------------------------------------------------------
# ModelMetadataRepository
# --------------------------------------------------------------------------


def test_get_production_returns_none_when_nothing_is_registered(
    db_session: Session,
) -> None:
    assert ModelMetadataRepository(db_session).get_production("risk") is None


def test_get_production_ignores_staged_versions(db_session: Session, tmp_path) -> None:
    model_path = tmp_path / "staged.joblib"
    joblib.dump(_tiny_pipeline(), model_path)
    db_session.add(
        ModelMetadata(
            model_name="risk",
            version="v1",
            algorithm="xgboost",
            artifact_path=str(model_path),
            status="staged",
            trained_at=datetime.now(UTC),
        )
    )
    db_session.commit()
    assert ModelMetadataRepository(db_session).get_production("risk") is None


def test_demote_other_versions_leaves_exactly_one_production_row(
    db_session: Session, tmp_path
) -> None:
    _register(db_session, tmp_path, "risk", version="v1")
    newer = _register(db_session, tmp_path, "risk", version="v2")

    repo = ModelMetadataRepository(db_session)
    repo.demote_other_versions("risk", keep_id=newer.id)
    db_session.commit()

    production = [r for r in repo.list_for_name("risk") if r.status == "production"]
    assert [r.id for r in production] == [newer.id]


# --------------------------------------------------------------------------
# ModelLoader
# --------------------------------------------------------------------------


def test_model_loader_raises_when_nothing_is_registered(db_session: Session) -> None:
    with pytest.raises(ModelNotAvailableError):
        ModelLoader(db_session).get_production_pipeline("risk")


def test_model_loader_raises_when_the_artifact_file_is_missing(
    db_session: Session,
) -> None:
    db_session.add(
        ModelMetadata(
            model_name="risk",
            version="v1",
            algorithm="xgboost",
            artifact_path="/does/not/exist.joblib",
            status="production",
            trained_at=datetime.now(UTC),
        )
    )
    db_session.commit()
    with pytest.raises(ModelNotAvailableError):
        ModelLoader(db_session).get_production_pipeline("risk")


def test_model_loader_loads_a_real_pipeline(db_session: Session, tmp_path) -> None:
    _register(db_session, tmp_path, "risk")
    pipeline, record = ModelLoader(db_session).get_production_pipeline("risk")
    assert record.model_name == "risk"
    assert hasattr(pipeline, "predict_proba")


def test_model_loader_caches_by_resolved_artifact_path(
    db_session: Session, tmp_path
) -> None:
    _register(db_session, tmp_path, "risk")
    loader = ModelLoader(db_session)
    first, _ = loader.get_production_pipeline("risk")
    second, _ = loader.get_production_pipeline("risk")
    assert first is second  # same object: loaded from cache, not re-read from disk


# --------------------------------------------------------------------------
# FeatureBuilder
# --------------------------------------------------------------------------


def _make_patient(db_session: Session, mrn: str = "MRN-1", **overrides) -> Patient:
    defaults = {
        "age_group": "61",
        "gender": "Female",
        "primary_diagnosis": "Cardiac failure",
    }
    defaults.update(overrides)
    patient = Patient(medical_record_number=mrn, **defaults)
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


def _make_admission(db_session: Session, patient_id: int, **overrides) -> Admission:
    defaults = {
        "admission_date": datetime(2024, 3, 1).date(),
        "time_in_hospital": 5,
        "admission_type": "Emergency",
        "num_medications": 7,
    }
    defaults.update(overrides)
    admission = Admission(patient_id=patient_id, **defaults)
    db_session.add(admission)
    db_session.commit()
    db_session.refresh(admission)
    return admission


def test_feature_row_maps_postgres_columns_onto_training_column_names(
    db_session: Session,
) -> None:
    """age_group/primary_diagnosis/time_in_hospital/num_medications must map
    back onto age/diagnosis/length_of_stay/medication_count - the exact
    inverse of dataset_import_service's INDIA_HOSPITAL_READMISSION profile."""
    patient = _make_patient(db_session)
    _make_admission(db_session, patient.id)

    row = FeatureBuilder(db_session).build_for_patient(patient)

    assert list(row.columns) == FEATURE_COLUMNS
    assert row["age"].iloc[0] == 61
    assert row["diagnosis"].iloc[0] == "Cardiac failure"
    assert row["length_of_stay"].iloc[0] == 5
    assert row["medication_count"].iloc[0] == 7


def test_feature_row_uses_the_most_recent_admission_when_none_is_given(
    db_session: Session,
) -> None:
    patient = _make_patient(db_session)
    _make_admission(db_session, patient.id, admission_date=datetime(2024, 1, 1).date())
    later = _make_admission(
        db_session, patient.id, admission_date=datetime(2024, 6, 1).date()
    )

    row = FeatureBuilder(db_session).build_for_patient(patient)

    assert row["length_of_stay"].iloc[0] == later.time_in_hospital
    assert row["prior_admission_count"].iloc[0] == 1  # one earlier admission


def test_feature_row_for_a_specific_admission_reflects_its_position_in_history(
    db_session: Session,
) -> None:
    patient = _make_patient(db_session)
    first = _make_admission(
        db_session, patient.id, admission_date=datetime(2024, 1, 1).date()
    )
    _make_admission(db_session, patient.id, admission_date=datetime(2024, 6, 1).date())

    row = FeatureBuilder(db_session).build_for_patient(patient, admission=first)

    assert (
        row["prior_admission_count"].iloc[0] == 0
    )  # the FIRST admission, not the latest


def test_feature_row_raises_when_the_patient_has_no_admissions(
    db_session: Session,
) -> None:
    patient = _make_patient(db_session)
    with pytest.raises(InsufficientPatientDataError) as exc_info:
        FeatureBuilder(db_session).build_for_patient(patient)
    assert "admission_history" in exc_info.value.missing_fields


def test_feature_row_raises_when_age_is_unparseable(db_session: Session) -> None:
    patient = _make_patient(db_session, age_group=None)
    _make_admission(db_session, patient.id)
    with pytest.raises(InsufficientPatientDataError) as exc_info:
        FeatureBuilder(db_session).build_for_patient(patient)
    assert "age" in exc_info.value.missing_fields
