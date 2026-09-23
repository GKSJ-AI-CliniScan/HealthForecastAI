"""Tests for Healthcare Analytics endpoints (Module 6)."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_doctor_forbidden_from_hospital_analytics(client: TestClient, auth_header) -> None:
    """Doctors cannot access executive hospital analytics."""
    response = client.get("/api/v1/analytics/summary", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403


def test_hospital_admin_summary(client: TestClient, auth_header) -> None:
    """Hospital admin successfully retrieves KPI summary."""
    response = client.get("/api/v1/analytics/summary", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    body = response.json()
    assert body["total_patients"] > 0
    assert body["total_admissions"] > 0
    assert body["readmission_rate"] > 0
    assert "risk_distribution" in body


def test_readmission_trends(client: TestClient, auth_header) -> None:
    """Verify monthly readmission trends."""
    response = client.get(
        "/api/v1/analytics/readmissions", headers=auth_header(Role.HOSPITAL_ADMIN)
    )
    assert response.status_code == 200
    trends = response.json()
    assert len(trends) > 0
    assert "readmission_rate" in trends[0]


def test_researcher_population_health(client: TestClient, auth_header) -> None:
    """Researchers can access aggregated population health statistics."""
    response = client.get(
        "/api/v1/analytics/population-health", headers=auth_header(Role.RESEARCHER)
    )
    assert response.status_code == 200
    body = response.json()
    assert "primary_diagnosis_breakdown" in body
    assert "age_distribution" in body


def test_performance_kpis(client: TestClient, auth_header) -> None:
    """Verify operational hospital performance metrics."""
    response = client.get("/api/v1/analytics/performance", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    body = response.json()
    assert "bed_occupancy_rate" in body
    assert body["bed_occupancy_rate"] > 0
