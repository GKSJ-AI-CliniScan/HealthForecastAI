"""Tests for treatment effectiveness analytics and patient treatment analysis."""

import uuid
from datetime import date

from fastapi.testclient import TestClient

from app.models import DoctorPatientAssignment, Patient, Treatment


def test_treatment_analytics_aggregation(client: TestClient, admin_token_headers: dict, db_session):
    """Test treatment effectiveness calculation and outcome distribution."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="TX-TEST-001",
        first_name="Alice",
        last_name="Smith",
    )
    db_session.add(patient)
    db_session.commit()

    # Add treatments with outcomes
    t1 = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Chemotherapy Cycle 1",
        treatment_type="Oncology",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 20),
        status="COMPLETED",
        outcome="IMPROVED",
        effectiveness_score=85.0,
    )
    t2 = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Physical Therapy",
        treatment_type="Rehabilitation",
        start_date=date(2026, 2, 1),
        end_date=date(2026, 2, 15),
        status="COMPLETED",
        outcome="STABLE",
        effectiveness_score=75.0,
    )
    t3 = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Antibiotic IV",
        treatment_type="Infectious Disease",
        start_date=date(2026, 3, 1),
        status="ACTIVE",
        outcome=None,
        effectiveness_score=None,  # Missing score should NOT be converted to 0
    )
    db_session.add_all([t1, t2, t3])
    db_session.commit()

    resp = client.get("/api/v1/analytics/treatments", headers=admin_token_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_treatments"] >= 3
    assert data["completed_treatments"] >= 2
    assert data["outcome_distribution"]["IMPROVED"] >= 1
    assert data["outcome_distribution"]["STABLE"] >= 1
    # Average should only include evaluated scores (85 + 75) / 2 = 80
    assert data["average_effectiveness"] is not None
    assert data["average_effectiveness"] >= 70.0


def test_treatment_analytics_filtering(client: TestClient, admin_token_headers: dict, db_session):
    """Test filtering treatment analytics by modality and outcome."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="TX-FILTER-001",
        first_name="Bob",
        last_name="Jones",
    )
    db_session.add(patient)
    db_session.commit()

    tx = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Targeted Dialysis",
        treatment_type="Nephrology",
        start_date=date(2026, 4, 1),
        status="COMPLETED",
        outcome="IMPROVED",
        effectiveness_score=90.0,
    )
    db_session.add(tx)
    db_session.commit()

    resp = client.get(
        "/api/v1/analytics/treatments?treatment_type=Nephrology&outcome=IMPROVED",
        headers=admin_token_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_treatments"] >= 1
    assert data["outcome_distribution"]["IMPROVED"] >= 1


def test_patient_treatment_analysis(
    client: TestClient, doctor_token_headers: dict, doctor_user, db_session
):
    """Test GET /api/v1/patients/{patient_id}/treatment-analysis for assigned doctor."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="PT-ANALYSIS-01",
        first_name="Claire",
        last_name="Redfield",
    )
    db_session.add(patient)
    db_session.commit()

    # Assign doctor
    db_session.add(
        DoctorPatientAssignment(
            id=uuid.uuid4(),
            doctor_id=doctor_user.id,
            patient_id=patient.id,
        )
    )

    t = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Insulin Regimen",
        treatment_type="Endocrinology",
        start_date=date(2026, 1, 10),
        end_date=date(2026, 1, 25),
        status="COMPLETED",
        outcome="IMPROVED",
        effectiveness_score=88.0,
    )
    db_session.add(t)
    db_session.commit()

    resp = client.get(
        f"/api/v1/patients/{patient.id}/treatment-analysis",
        headers=doctor_token_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["patient_id"] == str(patient.id)
    assert len(data["treatments"]) == 1
    assert data["treatments"][0]["duration_days"] == 15
    assert data["summary"]["average_effectiveness"] == 88.0
