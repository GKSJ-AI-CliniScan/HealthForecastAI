"""Integration tests for prediction endpoints, RBAC, doctor scoping, and analytics."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.patient import Patient


def test_unauthorized_prediction_rejected(client: TestClient):
    """Calling prediction API without authorization token returns 401."""
    resp = client.post(
        "/api/v1/predictions/readmission",
        json={"patient_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 401


def test_doctor_can_generate_prediction_for_assigned_patient(
    client: TestClient, db_session: Session, user_tokens: dict[str, str]
):
    """Doctor can generate prediction for assigned Patient 1."""
    patient = db_session.query(Patient).filter(Patient.patient_identifier == "PAT-TEST-001").first()
    assert patient is not None

    resp = client.post(
        "/api/v1/predictions/readmission",
        json={"patient_id": str(patient.id)},
        headers={"Authorization": user_tokens["DOCTOR"]},
    )
    assert resp.status_code == 201
    data = resp.json()

    assert data["patient_id"] == str(patient.id)
    assert data["prediction_type"] == "READMISSION"
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_category"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert 0.0 <= data["readmission_probability"] <= 1.0
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert isinstance(data["contributing_factors"], list)
    assert "model_version" in data
    assert data["patient_identifier"] == "PAT-TEST-001"


def test_doctor_cannot_generate_prediction_for_unassigned_patient(
    client: TestClient, db_session: Session, user_tokens: dict[str, str]
):
    """Doctor cannot generate prediction for unassigned Patient 2 (returns 403)."""
    pat2 = db_session.query(Patient).filter(Patient.patient_identifier == "PAT-TEST-002").first()
    assert pat2 is not None

    resp = client.post(
        "/api/v1/predictions/readmission",
        json={"patient_id": str(pat2.id)},
        headers={"Authorization": user_tokens["DOCTOR"]},
    )
    assert resp.status_code == 403


def test_hospital_admin_can_predict_and_view_all_predictions(
    client: TestClient, db_session: Session, user_tokens: dict[str, str]
):
    """Hospital admin can generate prediction on any patient and list history."""
    pat2 = db_session.query(Patient).filter(Patient.patient_identifier == "PAT-TEST-002").first()
    assert pat2 is not None

    # Predict on patient 2
    create_resp = client.post(
        "/api/v1/predictions/readmission",
        json={"patient_id": str(pat2.id)},
        headers={"Authorization": user_tokens["HOSPITAL_ADMIN"]},
    )
    assert create_resp.status_code == 201

    # List all predictions
    list_resp = client.get(
        "/api/v1/predictions",
        headers={"Authorization": user_tokens["HOSPITAL_ADMIN"]},
    )
    assert list_resp.status_code == 200
    items = list_resp.json()["items"]
    assert len(items) >= 1


def test_researcher_receives_anonymized_predictions(
    client: TestClient, db_session: Session, user_tokens: dict[str, str]
):
    """Researcher sees de-identified identifiers without patient names or PII."""
    patient = db_session.query(Patient).filter(Patient.patient_identifier == "PAT-TEST-001").first()

    # Generate prediction as Admin
    client.post(
        "/api/v1/predictions/readmission",
        json={"patient_id": str(patient.id)},
        headers={"Authorization": user_tokens["SYSTEM_ADMIN"]},
    )

    # Fetch as Researcher
    resp = client.get(
        "/api/v1/predictions",
        headers={"Authorization": user_tokens["RESEARCHER"]},
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) >= 1
    # Check that patient identifier is anonymized
    assert items[0]["patient_identifier"].startswith("ANON-")
    assert items[0]["patient_name"] == "De-Identified Inpatient"


def test_researcher_cannot_trigger_prediction(
    client: TestClient, db_session: Session, user_tokens: dict[str, str]
):
    """Researcher cannot generate new predictions (read-only access, returns 403)."""
    patient = db_session.query(Patient).first()
    resp = client.post(
        "/api/v1/predictions/readmission",
        json={"patient_id": str(patient.id)},
        headers={"Authorization": user_tokens["RESEARCHER"]},
    )
    assert resp.status_code == 403


def test_analytics_endpoints(client: TestClient, user_tokens: dict[str, str]):
    """Analytics endpoints return valid aggregated structures from database."""
    # 1. Summary
    summary_resp = client.get(
        "/api/v1/analytics/prediction-summary",
        headers={"Authorization": user_tokens["SYSTEM_ADMIN"]},
    )
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert "total_predictions" in summary_data
    assert "average_readmission_probability" in summary_data

    # 2. Risk Distribution
    dist_resp = client.get(
        "/api/v1/analytics/risk-distribution",
        headers={"Authorization": user_tokens["SYSTEM_ADMIN"]},
    )
    assert dist_resp.status_code == 200
    dist_data = dist_resp.json()
    assert "distribution" in dist_data
    assert len(dist_data["distribution"]) == 4

    # 3. Trends
    trends_resp = client.get(
        "/api/v1/analytics/readmission-trends",
        headers={"Authorization": user_tokens["SYSTEM_ADMIN"]},
    )
    assert trends_resp.status_code == 200
    trends_data = trends_resp.json()
    assert "trends" in trends_data
