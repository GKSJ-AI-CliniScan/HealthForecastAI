"""Authentication test suite."""

import pytest
from fastapi.testclient import TestClient


def test_login_success(client: TestClient):
    """Test successful user login."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "dr.test", "password": "HealthForecast2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client: TestClient):
    """Test login failure with wrong password."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "dr.test", "password": "WrongPassword123!"},
    )
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_login_nonexistent_user(client: TestClient):
    """Test login failure with unknown user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "nonexistent@user.com", "password": "anypassword"},
    )
    assert response.status_code == 401


def test_get_current_user(client: TestClient, user_tokens: dict[str, str]):
    """Test /auth/me returns authenticated user details."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": user_tokens["DOCTOR"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "dr.test"
    assert data["role"] == "DOCTOR"


def test_refresh_token_flow(client: TestClient):
    """Test token refresh workflow."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "dr.test", "password": "HealthForecast2026!"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
