"""Tests for recovery flow and patient outcome progression."""

import uuid
from datetime import date

from fastapi.testclient import TestClient

from app.models import Admission, DoctorPatientAssignment, Patient, PatientOutcome, Treatment


def test_patient_recovery_timeline(
    client: TestClient, doctor_token_headers: dict, doctor_user, db_session
):
    """Test unified recovery timeline generation."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="REC-TEST-001",
        first_name="David",
        last_name="Banner",
    )
    db_session.add(patient)
    db_session.commit()

    db_session.add(
        DoctorPatientAssignment(
            id=uuid.uuid4(),
            doctor_id=doctor_user.id,
            patient_id=patient.id,
        )
    )

    # 1. Admission
    adm = Admission(
        id=uuid.uuid4(),
        patient_id=patient.id,
        admission_date=date(2026, 2, 1),
        discharge_date=date(2026, 2, 8),
        admission_type="Emergency",
        department="Cardiology",
        primary_diagnosis="Arrhythmia",
        length_of_stay=7,
        discharge_disposition="Discharged Home",
    )
    # 2. Treatment
    tx = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Beta Blocker Therapy",
        treatment_type="Pharmacotherapy",
        start_date=date(2026, 2, 2),
        end_date=date(2026, 2, 7),
        status="COMPLETED",
        outcome="IMPROVED",
        effectiveness_score=92.0,
    )
    # 3. Outcome
    out = PatientOutcome(
        id=uuid.uuid4(),
        patient_id=patient.id,
        admission_id=adm.id,
        outcome_status="DISCHARGED_RECOVERED",
        outcome_score=90.0,
        recorded_date=date(2026, 2, 8),
        notes="Normal sinus rhythm restored.",
    )
    db_session.add_all([adm, tx, out])
    db_session.commit()

    resp = client.get(
        f"/api/v1/patients/{patient.id}/recovery",
        headers=doctor_token_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["patient_id"] == str(patient.id)
    assert len(data["timeline"]) >= 4  # Admission, Treatment, Treatment Outcome, Discharge, Outcome
    assert data["average_length_of_stay"] == 7.0
    assert data["recovery_status"] == "DISCHARGED_RECOVERED"
    assert data["latest_outcome_score"] == 90.0


def test_create_and_list_patient_outcomes(
    client: TestClient, doctor_token_headers: dict, doctor_user, db_session
):
    """Test recording and retrieving patient outcome evaluations."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="OUT-TEST-002",
        first_name="Elena",
        last_name="Fisher",
    )
    db_session.add(patient)
    db_session.commit()

    db_session.add(
        DoctorPatientAssignment(
            id=uuid.uuid4(),
            doctor_id=doctor_user.id,
            patient_id=patient.id,
        )
    )
    db_session.commit()

    # Create outcome
    payload = {
        "outcome_status": "IMPROVING",
        "outcome_score": 82.5,
        "recorded_date": "2026-03-01",
        "notes": "Patient ambulatory without support.",
    }
    create_resp = client.post(
        f"/api/v1/patients/{patient.id}/outcomes",
        json=payload,
        headers=doctor_token_headers,
    )
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    assert created_data["outcome_status"] == "IMPROVING"
    assert created_data["outcome_score"] == 82.5

    # List outcomes
    list_resp = client.get(
        f"/api/v1/patients/{patient.id}/outcomes",
        headers=doctor_token_headers,
    )
    assert list_resp.status_code == 200
    outcomes_list = list_resp.json()
    assert len(outcomes_list) == 1
    assert outcomes_list[0]["outcome_status"] == "IMPROVING"
