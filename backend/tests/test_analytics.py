"""Tests for Analytics, Treatment Outcomes, Clinical Support, and Model Registry endpoints."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_list_models_system_admin(client: TestClient, auth_header) -> None:
    """System administrator can query the AI model registry."""
    response = client.get(
        "/api/v1/models",
        headers=auth_header(Role.SYSTEM_ADMIN),
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_active_model_details(client: TestClient, auth_header) -> None:
    """System administrator can inspect active model details."""
    response = client.get(
        "/api/v1/models/active",
        headers=auth_header(Role.SYSTEM_ADMIN),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "readmission_xgboost_v1"
    assert data["status"] == "ready"


def test_model_metrics(client: TestClient, auth_header) -> None:
    """System administrator can view model performance metrics."""
    response = client.get(
        "/api/v1/models/metrics",
        headers=auth_header(Role.SYSTEM_ADMIN),
    )
    assert response.status_code == 200
    data = response.json()
    assert "accuracy" in data or "roc_auc" in data


def test_analytics_summary_admin(client: TestClient, auth_header) -> None:
    """Hospital Administrator can view hospital KPI analytics summary."""
    response = client.get(
        "/api/v1/analytics/summary",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200


def test_analytics_readmissions(client: TestClient, auth_header) -> None:
    """Hospital Administrator can view readmission trends."""
    response = client.get(
        "/api/v1/analytics/readmissions",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200


def test_treatment_effectiveness(client: TestClient, auth_header) -> None:
    """Hospital Administrator or Researcher can view treatment effectiveness rollups."""
    response = client.get(
        "/api/v1/treatment",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200


def test_population_health_researcher(client: TestClient, auth_header) -> None:
    """Researcher can view population health metrics."""
    response = client.get(
        "/api/v1/analytics/population-health",
        headers=auth_header(Role.RESEARCHER),
    )
    assert response.status_code == 200


def test_clinical_support_doctor(client: TestClient, auth_header) -> None:
    """Doctor can access clinical decision support recommendations."""
    response = client.get(
        "/api/v1/clinical-support/recommendations/1",
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 200
