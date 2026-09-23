"""Tests for Treatment Effectiveness endpoints (Module 4)."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_unauthenticated_treatment_rejected(client: TestClient) -> None:
    """Unauthenticated requests are rejected."""
    response = client.get("/api/v1/treatment")
    assert response.status_code == 401


def test_doctor_gets_limited_treatment_reports(client: TestClient, auth_header) -> None:
    """Doctors receive limited treatment scope (top active regimens)."""
    response = client.get("/api/v1/treatment", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 3
    assert all("treatment_name" in item for item in data)


def test_hospital_admin_gets_full_treatment_reports(client: TestClient, auth_header) -> None:
    """Hospital administrators receive full treatment cohorts."""
    response = client.get("/api/v1/treatment", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6


def test_recovery_trends_endpoint(client: TestClient, auth_header) -> None:
    """Verify recovery trend weekly time-series."""
    response = client.get(
        "/api/v1/treatment/recovery-trends",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200
    trends = response.json()
    assert len(trends) > 0
    assert "week" in trends[0]
    assert "average_recovery_score" in trends[0]


def test_medication_outcomes_endpoint(client: TestClient, auth_header) -> None:
    """Verify medication change vs outcome comparison."""
    response = client.get(
        "/api/v1/treatment/medication-outcomes",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200
    body = response.json()
    assert "cohorts" in body
    assert "relative_risk_reduction" in body
    assert len(body["cohorts"]) == 2
