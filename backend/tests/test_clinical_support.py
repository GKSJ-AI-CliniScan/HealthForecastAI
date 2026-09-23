"""Tests for Clinical Decision Support and Anonymized Patient Access (Modules 2 & 5)."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_doctor_can_generate_care_recommendations(client: TestClient, auth_header) -> None:
    """Doctors can generate care recommendations."""
    response = client.get(
        "/api/v1/clinical-support/recommendations/15678",
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == 15678
    assert len(body["recommendations"]) > 0
    assert body["follow_up_days"] is not None


def test_doctor_can_generate_discharge_plan(client: TestClient, auth_header) -> None:
    """Doctors can generate a discharge readiness plan."""
    response = client.get(
        "/api/v1/clinical-support/discharge-plan/15678",
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 200
    body = response.json()
    assert "readiness_score" in body
    assert "ready_for_discharge" in body
    assert len(body["risk_mitigation"]) > 0


def test_researcher_forbidden_from_clinical_support(client: TestClient, auth_header) -> None:
    """Researchers cannot generate individual patient care recommendations."""
    response = client.get(
        "/api/v1/clinical-support/recommendations/15678",
        headers=auth_header(Role.RESEARCHER),
    )
    assert response.status_code == 403


def test_researcher_accesses_anonymized_patient_cohort(client: TestClient, auth_header) -> None:
    """Researchers receive de-identified records with pseudonymized research IDs."""
    response = client.get(
        "/api/v1/patients/anonymised",
        headers=auth_header(Role.RESEARCHER),
    )
    assert response.status_code == 200
    patients = response.json()
    assert len(patients) > 0
    first = patients[0]
    assert "research_id" in first
    assert first["research_id"].startswith("RES-")
    # Verify direct identifiers are stripped
    assert "mrn" not in first
    assert "name" not in first
