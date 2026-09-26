"""Tests for Milestone 3 Treatment Effectiveness & Clinical Decision Support."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_treatment_effectiveness_endpoint(client: TestClient, make_user, auth_header):
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/treatment", headers=auth_header(admin))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_recovery_trends_endpoint(client: TestClient, make_user, auth_header):
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/treatment/recovery-trends", headers=auth_header(admin))
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)


def test_care_recommendations_endpoint(client: TestClient, make_user, make_patient, auth_header):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    response = client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}", headers=auth_header(doctor)
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == patient.id
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)


def test_discharge_plan_endpoint(client: TestClient, make_user, make_patient, auth_header):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    response = client.get(
        f"/api/v1/clinical-support/discharge-plan/{patient.id}", headers=auth_header(doctor)
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == patient.id
    assert "risk_mitigation" in data
    assert "checklist" in data
