"""Tests for healthcare analytics services."""

from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import Admission, Patient, TreatmentOutcome
from app.services.analytics_service import (
    get_hospital_summary,
    get_population_health,
    get_readmission_trends,
    get_recovery_trends,
    get_treatment_effectiveness,
    get_medication_outcomes,
)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide an isolated in-memory SQLite database."""

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)

    testing_session_local = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
    )

    db = testing_session_local()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_hospital_summary_returns_zero_values_when_empty(
    db_session: Session,
) -> None:
    """Return zero-valued summary when no hospital data exists."""

    result = get_hospital_summary(db_session)

    assert result["total_patients"] == 0
    assert result["total_admissions"] == 0
    assert result["readmission_rate"] == 0.0
    assert result["average_length_of_stay"] == 0.0


def test_hospital_summary_calculates_admissions_and_readmissions(
    db_session: Session,
) -> None:
    """Calculate hospital-level admission and readmission statistics."""

    patient_one = Patient(
        id=1,
        medical_record_number="TEST-001",
        age_group="50-59",
    )

    patient_two = Patient(
        id=2,
        medical_record_number="TEST-002",
        age_group="60-69",
    )

    db_session.add_all([patient_one, patient_two])
    db_session.flush()

    admissions = [
        Admission(
            patient_id=patient_one.id,
            admission_date=date(2026, 3, 1),
            discharge_date=date(2026, 3, 5),
            time_in_hospital=4,
            readmitted="<30",
        ),
        Admission(
            patient_id=patient_two.id,
            admission_date=date(2026, 3, 10),
            discharge_date=date(2026, 3, 14),
            time_in_hospital=4,
            readmitted="NO",
        ),
    ]

    db_session.add_all(admissions)
    db_session.commit()

    result = get_hospital_summary(db_session)

    assert result["total_patients"] == 2
    assert result["total_admissions"] == 2
    assert result["readmission_rate"] == pytest.approx(0.5)
    assert result["average_length_of_stay"] == pytest.approx(4.0)


def test_treatment_effectiveness_aggregates_treatments(
    db_session: Session,
) -> None:
    """Aggregate treatment recovery and readmission statistics."""

    patient_one = Patient(
        id=1,
        medical_record_number="TEST-001",
        age_group="50-59",
    )

    patient_two = Patient(
        id=2,
        medical_record_number="TEST-002",
        age_group="60-69",
    )

    db_session.add_all([patient_one, patient_two])
    db_session.flush()

    admission_one = Admission(
        patient_id=patient_one.id,
        admission_date=date(2026, 3, 1),
        discharge_date=date(2026, 3, 5),
        time_in_hospital=4,
        readmitted="<30",
    )

    admission_two = Admission(
        patient_id=patient_two.id,
        admission_date=date(2026, 3, 10),
        discharge_date=date(2026, 3, 15),
        time_in_hospital=5,
        readmitted="NO",
    )

    db_session.add_all([admission_one, admission_two])
    db_session.flush()

    treatment_one = TreatmentOutcome(
        admission_id=admission_one.id,
        treatment_name="Treatment A",
        medication_change=True,
        recovery_score=80.0,
        length_of_stay_days=4,
        outcome="partial",
    )

    treatment_two = TreatmentOutcome(
        admission_id=admission_two.id,
        treatment_name="Treatment A",
        medication_change=False,
        recovery_score=90.0,
        length_of_stay_days=5,
        outcome="recovered",
    )

    db_session.add_all([treatment_one, treatment_two])
    db_session.commit()

    result = get_treatment_effectiveness(db_session)

    assert len(result) == 1

    treatment = result[0]

    assert treatment["treatment_name"] == "Treatment A"
    assert treatment["patients_treated"] == 2
    assert treatment["average_recovery_score"] == pytest.approx(85.0)
    assert treatment["readmission_rate"] == pytest.approx(0.5)


def test_recovery_trends_group_by_week(
    db_session: Session,
) -> None:
    """Group recovery scores by admission week."""

    patient = Patient(
        id=1,
        medical_record_number="TEST-001",
        age_group="50-59",
    )

    db_session.add(patient)
    db_session.flush()

    admission = Admission(
        patient_id=patient.id,
        admission_date=date(2026, 3, 2),
        discharge_date=date(2026, 3, 6),
        time_in_hospital=4,
        readmitted="NO",
    )

    db_session.add(admission)
    db_session.flush()

    treatment_one = TreatmentOutcome(
        admission_id=admission.id,
        treatment_name="Treatment A",
        recovery_score=70.0,
        length_of_stay_days=4,
        outcome="partial",
    )

    treatment_two = TreatmentOutcome(
        admission_id=admission.id,
        treatment_name="Treatment B",
        recovery_score=90.0,
        length_of_stay_days=4,
        outcome="recovered",
    )

    db_session.add_all([treatment_one, treatment_two])
    db_session.commit()

    result = get_recovery_trends(db_session)

    assert len(result) == 1
    assert result[0]["week"] == "2026-W10"
    assert result[0]["average_recovery_score"] == pytest.approx(80.0)


def test_medication_outcomes(
    db_session: Session,
) -> None:
    """Medication outcome analysis groups outcomes correctly."""

    patient = Patient(
        medical_record_number="MRN-MED-001",
        age_group="40-49",
        gender="Male",
        race="Demo",
        primary_diagnosis="Diabetes",
    )

    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    admission_one = Admission(
        patient_id=patient.id,
        admission_date=date(2026, 1, 10),
        discharge_date=date(2026, 1, 15),
        time_in_hospital=5,
        readmitted="<30",
    )

    admission_two = Admission(
        patient_id=patient.id,
        admission_date=date(2026, 2, 10),
        discharge_date=date(2026, 2, 14),
        time_in_hospital=4,
        readmitted="NO",
    )

    db_session.add_all(
        [
            admission_one,
            admission_two,
        ]
    )
    db_session.commit()

    db_session.refresh(admission_one)
    db_session.refresh(admission_two)

    db_session.add_all(
        [
            TreatmentOutcome(
                admission_id=admission_one.id,
                treatment_name="Test Treatment A",
                medication_change=True,
                recovery_score=80,
                outcome="improved",
            ),
            TreatmentOutcome(
                admission_id=admission_two.id,
                treatment_name="Test Treatment B",
                medication_change=False,
                recovery_score=60,
                outcome="stable",
            ),
        ]
    )

    db_session.commit()

    results = get_medication_outcomes(db_session)

    assert len(results) == 2

    changed = next(
        item
        for item in results
        if item["medication_change"] is True
    )

    unchanged = next(
        item
        for item in results
        if item["medication_change"] is False
    )

    assert changed["patients_treated"] == 1
    assert changed["average_recovery_score"] == 80.0
    assert changed["readmission_rate"] == 1.0
    assert changed["improved_count"] == 1

    assert unchanged["patients_treated"] == 1
    assert unchanged["average_recovery_score"] == 60.0
    assert unchanged["readmission_rate"] == 0.0
    assert unchanged["stable_count"] == 1


def test_readmission_trends_group_by_month(
    db_session: Session,
) -> None:
    """Group admissions and readmissions by calendar month."""

    patient_one = Patient(
        id=1,
        medical_record_number="TEST-001",
        age_group="50-59",
    )

    patient_two = Patient(
        id=2,
        medical_record_number="TEST-002",
        age_group="60-69",
    )

    db_session.add_all([patient_one, patient_two])
    db_session.flush()

    db_session.add_all(
        [
            Admission(
                patient_id=patient_one.id,
                admission_date=date(2026, 3, 1),
                discharge_date=date(2026, 3, 5),
                time_in_hospital=4,
                readmitted="<30",
            ),
            Admission(
                patient_id=patient_two.id,
                admission_date=date(2026, 3, 10),
                discharge_date=date(2026, 3, 14),
                time_in_hospital=4,
                readmitted="NO",
            ),
        ]
    )

    db_session.commit()

    result = get_readmission_trends(db_session)

    assert len(result) == 1
    assert result[0]["period"] == "2026-03"
    assert result[0]["admissions"] == 2
    assert result[0]["readmissions"] == 1
    assert result[0]["readmission_rate"] == pytest.approx(0.5)


def test_population_health_groups_by_age(
    db_session: Session,
) -> None:
    """Aggregate population-health statistics by age group."""

    patient_one = Patient(
        id=1,
        medical_record_number="TEST-001",
        age_group="50-59",
    )

    patient_two = Patient(
        id=2,
        medical_record_number="TEST-002",
        age_group="60-69",
    )

    db_session.add_all([patient_one, patient_two])
    db_session.flush()

    db_session.add_all(
        [
            Admission(
                patient_id=patient_one.id,
                admission_date=date(2026, 3, 1),
                discharge_date=date(2026, 3, 5),
                time_in_hospital=4,
                readmitted="<30",
            ),
            Admission(
                patient_id=patient_two.id,
                admission_date=date(2026, 3, 10),
                discharge_date=date(2026, 3, 14),
                time_in_hospital=4,
                readmitted="NO",
            ),
        ]
    )

    db_session.commit()

    result = get_population_health(db_session)

    assert len(result) == 2

    first = result[0]
    second = result[1]

    assert first["age_group"] == "50-59"
    assert first["patient_count"] == 1
    assert first["admission_count"] == 1
    assert first["readmission_rate"] == pytest.approx(1.0)

    assert second["age_group"] == "60-69"
    assert second["patient_count"] == 1
    assert second["admission_count"] == 1
    assert second["readmission_rate"] == pytest.approx(0.0)
