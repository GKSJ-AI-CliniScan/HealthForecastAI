"""Unit tests for Analytics, Treatment Effectiveness, and Clinical Decision Support."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_hospital_summary_endpoint(client: TestClient, auth_header) -> None:
    """Hospital admin can fetch headline analytics summary."""
    response = client.get(
        "/api/v1/analytics/summary",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_patients" in data
    assert "total_admissions" in data
    assert "risk_distribution" in data


def test_readmission_trends_endpoint(client: TestClient, auth_header) -> None:
    """Hospital admin can retrieve readmission trends."""
    response = client.get(
        "/api/v1/analytics/readmissions",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_population_health_researcher_access(client: TestClient, auth_header) -> None:
    """Researcher can access aggregated population health cohorts."""
    response = client.get(
        "/api/v1/analytics/population-health",
        headers=auth_header(Role.RESEARCHER),
    )
    assert response.status_code == 200
    data = response.json()
    assert "cohorts" in data


def test_treatment_effectiveness_endpoint(client: TestClient, auth_header) -> None:
    """Hospital admin can fetch treatment effectiveness rollups."""
    response = client.get(
        "/api/v1/treatment",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_treatment_effectiveness_doctor_forbidden(client: TestClient, auth_header) -> None:
    """Doctor lacks full treatment report read permission and receives 403."""
    response = client.get(
        "/api/v1/treatment",
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 403


def test_care_recommendations_endpoint(client: TestClient, auth_header) -> None:
    """Doctor can generate care recommendations for a patient."""
    response = client.get(
        "/api/v1/clinical-support/recommendations/1",
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == 1
    assert "recommendations" in data


def test_discharge_plan_endpoint(client: TestClient, auth_header) -> None:
    """Doctor can generate a discharge readiness plan for a patient."""
    response = client.get(
        "/api/v1/clinical-support/discharge-plan/1",
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == 1
    assert "ready_for_discharge" in data
