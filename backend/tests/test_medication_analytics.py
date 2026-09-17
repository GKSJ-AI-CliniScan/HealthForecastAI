"""Tests for medication tracking, outcomes, and analytics."""

import uuid
from datetime import date

from fastapi.testclient import TestClient

from app.models import DoctorPatientAssignment, Medication, Patient


def test_patient_medication_crud(
    client: TestClient, doctor_token_headers: dict, doctor_user, db_session
):
    """Test creating, listing, updating, and deleting patient medication."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="MED-TEST-001",
        first_name="Frank",
        last_name="Castle",
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

    # 1. Create prescription
    create_payload = {
        "medication_name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "start_date": "2026-01-01",
        "status": "ACTIVE",
        "effectiveness_score": 85.0,
        "outcome": "STABLE",
    }
    create_resp = client.post(
        f"/api/v1/patients/{patient.id}/medications",
        json=create_payload,
        headers=doctor_token_headers,
    )
    assert create_resp.status_code == 201
    med_id = create_resp.json()["id"]

    # 2. List
    list_resp = client.get(
        f"/api/v1/patients/{patient.id}/medications",
        headers=doctor_token_headers,
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 3. Update
    update_resp = client.put(
        f"/api/v1/medications/{med_id}",
        json={"status": "COMPLETED", "effectiveness_score": 90.0, "outcome": "IMPROVED"},
        headers=doctor_token_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "COMPLETED"
    assert update_resp.json()["effectiveness_score"] == 90.0

    # 4. Delete
    del_resp = client.delete(
        f"/api/v1/medications/{med_id}",
        headers=doctor_token_headers,
    )
    assert del_resp.status_code == 204


def test_medication_analytics(client: TestClient, admin_token_headers: dict, db_session):
    """Test aggregated medication analytics."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="MED-ANALYTICS-01",
        first_name="Grace",
        last_name="Hopper",
    )
    db_session.add(patient)
    db_session.commit()

    m1 = Medication(
        id=uuid.uuid4(),
        patient_id=patient.id,
        medication_name="Metformin",
        start_date=date(2026, 1, 1),
        status="ACTIVE",
        effectiveness_score=80.0,
        outcome="IMPROVED",
    )
    m2 = Medication(
        id=uuid.uuid4(),
        patient_id=patient.id,
        medication_name="Metformin",
        start_date=date(2026, 2, 1),
        status="COMPLETED",
        effectiveness_score=85.0,
        outcome="STABLE",
    )
    db_session.add_all([m1, m2])
    db_session.commit()

    resp = client.get("/api/v1/analytics/medications", headers=admin_token_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_medications"] >= 2
    assert data["active_medications"] >= 1
    assert data["completed_medications"] >= 1
    assert data["average_effectiveness"] is not None
    assert len(data["medication_breakdown"]) >= 1
