"""Tests for hospital performance, department metrics, trends, and CSV exports."""

import uuid
from datetime import date

from fastapi.testclient import TestClient

from app.models import Admission, Patient, Treatment


def test_hospital_performance(client: TestClient, admin_token_headers: dict, db_session):
    """Test hospital KPIs retrieval."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="HOSP-TEST-001",
        first_name="Hank",
        last_name="Pym",
    )
    db_session.add(patient)
    db_session.commit()

    adm = Admission(
        id=uuid.uuid4(),
        patient_id=patient.id,
        admission_date=date(2026, 1, 5),
        discharge_date=date(2026, 1, 10),
        department="Neurology",
        length_of_stay=5,
    )
    tx = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Neuro Rehabilitation",
        start_date=date(2026, 1, 6),
        status="COMPLETED",
        outcome="IMPROVED",
        effectiveness_score=88.0,
    )
    db_session.add_all([adm, tx])
    db_session.commit()

    resp = client.get("/api/v1/analytics/hospital-performance", headers=admin_token_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_patients"] >= 1
    assert data["total_admissions"] >= 1
    assert data["total_treatments"] >= 1
    assert data["average_length_of_stay"] >= 0.0
    assert "readmission_statistics" in data


def test_department_analytics(client: TestClient, admin_token_headers: dict, db_session):
    """Test department-level aggregation."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="DEPT-TEST-001",
        first_name="Iris",
        last_name="West",
    )
    db_session.add(patient)
    db_session.commit()

    adm = Admission(
        id=uuid.uuid4(),
        patient_id=patient.id,
        admission_date=date(2026, 2, 10),
        discharge_date=date(2026, 2, 14),
        department="Cardiology",
        length_of_stay=4,
    )
    db_session.add(adm)
    db_session.commit()

    resp = client.get("/api/v1/analytics/departments", headers=admin_token_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "departments" in data
    dept_names = [d["department"] for d in data["departments"]]
    assert "Cardiology" in dept_names


def test_healthcare_trends(client: TestClient, admin_token_headers: dict, db_session):
    """Test daily, weekly, and monthly trend tracking."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="TREND-TEST-001",
        first_name="Jack",
        last_name="Ryan",
    )
    db_session.add(patient)
    db_session.commit()

    adm = Admission(
        id=uuid.uuid4(),
        patient_id=patient.id,
        admission_date=date(2026, 3, 5),
        department="Pediatrics",
    )
    db_session.add(adm)
    db_session.commit()

    for freq in ["daily", "weekly", "monthly"]:
        resp = client.get(f"/api/v1/analytics/trends?frequency={freq}", headers=admin_token_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["frequency"] == freq
        assert "trends" in data


def test_csv_export_researcher_anonymization(
    client: TestClient, researcher_token_headers: dict, admin_token_headers: dict, db_session
):
    """Verify that researcher CSV export contains NO PII, no names, and anonymized subject IDs."""
    patient = Patient(
        id=uuid.uuid4(),
        patient_identifier="PII-SECRET-12345",
        first_name="ConfidentialFirst",
        last_name="ConfidentialLast",
        email="secret@patient.com",
        phone="555-0199",
        address="123 Secret Lane",
    )
    db_session.add(patient)
    db_session.commit()

    tx = Treatment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        treatment_name="Experimental Therapy",
        treatment_type="Immunology",
        start_date=date(2026, 1, 1),
        status="COMPLETED",
        outcome="IMPROVED",
        effectiveness_score=95.0,
    )
    db_session.add(tx)
    db_session.commit()

    # 1. Researcher export
    researcher_resp = client.get(
        "/api/v1/analytics/export/treatments", headers=researcher_token_headers
    )
    assert researcher_resp.status_code == 200
    csv_text = researcher_resp.text

    # MUST NOT contain real patient identifiers or names
    assert "ConfidentialFirst" not in csv_text
    assert "ConfidentialLast" not in csv_text
    assert "secret@patient.com" not in csv_text
    assert "555-0199" not in csv_text
    assert "123 Secret Lane" not in csv_text
    assert "PII-SECRET-12345" not in csv_text
    assert str(patient.id) not in csv_text
    assert "Research_Subject_ID" in csv_text
    assert "ANON-PAT-" in csv_text

    # 2. Admin export (contains clinical details)
    admin_resp = client.get("/api/v1/analytics/export/treatments", headers=admin_token_headers)
    assert admin_resp.status_code == 200
    assert "Treatment_ID" in admin_resp.text
