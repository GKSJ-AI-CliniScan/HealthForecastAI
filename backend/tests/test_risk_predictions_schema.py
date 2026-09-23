"""Persistence and validation tests for the extended risk_predictions columns.

Covers prediction_type, confidence_score, readmission_window and the outcome
feedback columns added for Milestone 2. The pre-existing readmission_probability
and risk_category behaviour is already covered by test_database_schema.py and
is not repeated here.
"""

from datetime import UTC, datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction


def _make_patient(session: Session, mrn: str = "MRN-0001") -> Patient:
    patient = Patient(medical_record_number=mrn)
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient


def _make_admission(session: Session, patient_id: int) -> Admission:
    admission = Admission(patient_id=patient_id)
    session.add(admission)
    session.commit()
    session.refresh(admission)
    return admission


def _make_prediction(patient_id: int, **overrides) -> RiskPrediction:
    defaults = {
        "patient_id": patient_id,
        "readmission_probability": 0.42,
        "risk_category": "medium",
        "model_name": "risk_xgboost",
        "model_version": "1.0.0",
    }
    defaults.update(overrides)
    return RiskPrediction(**defaults)


def test_prediction_type_defaults_to_risk(db_session: Session) -> None:
    """A row inserted without prediction_type is a plain risk score."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id)
    db_session.add(prediction)
    db_session.commit()
    db_session.refresh(prediction)

    assert prediction.prediction_type == "risk"


def test_prediction_type_rejects_unknown_value(db_session: Session) -> None:
    """Only 'risk' and 'readmission' are valid prediction types."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id, prediction_type="treatment")
    db_session.add(prediction)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_readmission_prediction_requires_an_admission(db_session: Session) -> None:
    """A readmission forecast with no admission_id is meaningless and must be rejected."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id, prediction_type="readmission", admission_id=None)
    db_session.add(prediction)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_readmission_prediction_with_an_admission_succeeds(db_session: Session) -> None:
    """The normal readmission-forecast shape: patient, admission, window, confidence."""
    patient = _make_patient(db_session)
    admission = _make_admission(db_session, patient.id)
    prediction = _make_prediction(
        patient.id,
        admission_id=admission.id,
        prediction_type="readmission",
        readmission_window="30_day",
        confidence_score=0.78,
    )
    db_session.add(prediction)
    db_session.commit()
    db_session.refresh(prediction)

    assert prediction.prediction_type == "readmission"
    assert prediction.readmission_window == "30_day"
    assert prediction.confidence_score == pytest.approx(0.78)


def test_risk_prediction_does_not_require_an_admission(db_session: Session) -> None:
    """A general risk score may stand alone, unlike a readmission forecast."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id, prediction_type="risk", admission_id=None)
    db_session.add(prediction)
    db_session.commit()  # must not raise


@pytest.mark.parametrize("confidence_score", [-0.01, 1.5])
def test_confidence_score_out_of_range_is_rejected(
    db_session: Session, confidence_score: float
) -> None:
    """Confidence, like probability, is a [0, 1] value."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id, confidence_score=confidence_score)
    db_session.add(prediction)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_confidence_score_may_be_omitted(db_session: Session) -> None:
    """Risk scores generally have no confidence_score."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id, confidence_score=None)
    db_session.add(prediction)
    db_session.commit()  # must not raise


def test_readmission_window_rejects_unsupported_horizon(db_session: Session) -> None:
    """Only the 30-day (primary) and 90-day (secondary) horizons are valid."""
    patient = _make_patient(db_session)
    admission = _make_admission(db_session, patient.id)
    prediction = _make_prediction(
        patient.id,
        admission_id=admission.id,
        prediction_type="readmission",
        readmission_window="60_day",
    )
    db_session.add(prediction)
    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize("window", ["30_day", "90_day"])
def test_readmission_window_accepts_both_supported_horizons(
    db_session: Session, window: str
) -> None:
    """The primary (30-day) and secondary (90-day) horizons are both valid."""
    patient = _make_patient(db_session)
    admission = _make_admission(db_session, patient.id)
    prediction = _make_prediction(
        patient.id,
        admission_id=admission.id,
        prediction_type="readmission",
        readmission_window=window,
    )
    db_session.add(prediction)
    db_session.commit()  # must not raise


def test_outcome_feedback_columns_default_to_unresolved(db_session: Session) -> None:
    """A fresh prediction has no recorded outcome yet."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id)
    db_session.add(prediction)
    db_session.commit()
    db_session.refresh(prediction)

    assert prediction.actual_readmitted is None
    assert prediction.outcome_recorded_at is None


def test_outcome_feedback_can_be_recorded(db_session: Session) -> None:
    """FR-READM-04: once the outcome is known, it is written onto the same row."""
    patient = _make_patient(db_session)
    admission = _make_admission(db_session, patient.id)
    prediction = _make_prediction(
        patient.id, admission_id=admission.id, prediction_type="readmission"
    )
    db_session.add(prediction)
    db_session.commit()

    prediction.actual_readmitted = True
    prediction.outcome_recorded_at = datetime.now(UTC)
    db_session.commit()
    db_session.refresh(prediction)

    assert prediction.actual_readmitted is True
    assert prediction.outcome_recorded_at is not None


def test_existing_readmission_probability_validation_is_unaffected(db_session: Session) -> None:
    """The Milestone 1 probability-range constraint still applies unchanged."""
    patient = _make_patient(db_session)
    prediction = _make_prediction(patient.id, readmission_probability=1.5)
    db_session.add(prediction)
    with pytest.raises(IntegrityError):
        db_session.commit()
