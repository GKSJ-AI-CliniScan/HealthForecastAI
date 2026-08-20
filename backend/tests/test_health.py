"""Smoke tests for the service level endpoints."""

from fastapi.testclient import TestClient


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    """The liveness probe must return status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root_endpoint_returns_banner(client: TestClient) -> None:
    """The root endpoint must identify the service."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "HealthForecast AI"


def test_openapi_schema_is_generated(client: TestClient) -> None:
    """Every router must be mountable - a broken router breaks this test."""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/auth/roles" in paths
    assert "/api/v1/risk/predict" in paths
