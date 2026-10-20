"""Login, user management and audit trail."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_login_with_valid_credentials_returns_token(client: TestClient) -> None:
    """A demo doctor can log in and receives a token with their permissions."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "doctor1@hospital.test", "password": "Doctor@123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "doctor"
    assert body["token_type"] == "bearer"
    assert "risk_report:read" in body["permissions"]


def test_login_token_works_on_a_protected_endpoint(client: TestClient) -> None:
    """The issued token is accepted by /auth/me."""
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@hospital.test", "password": "Admin@123"},
    ).json()["access_token"]
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["role"] == "hospital_admin"


def test_login_with_wrong_password_is_rejected(client: TestClient) -> None:
    """A wrong password gives 401 and no token."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "doctor1@hospital.test", "password": "not-the-password"},
    )
    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_system_admin_can_create_user_and_new_user_can_log_in(
    client: TestClient, auth_header
) -> None:
    """User creation persists the account with a hashed password."""
    payload = {
        "email": "new.doctor@hospital.test",
        "full_name": "New Doctor",
        "role": "doctor",
        "password": "Sup3rSecret!",
    }
    created = client.post("/api/v1/users", json=payload, headers=auth_header(Role.SYSTEM_ADMIN))
    assert created.status_code == 201
    assert "password" not in created.json()
    login = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login.status_code == 200


def test_duplicate_email_is_rejected(client: TestClient, auth_header) -> None:
    """Two users cannot share an e-mail address."""
    payload = {
        "email": "doctor2@hospital.test",
        "full_name": "Duplicate",
        "role": "doctor",
        "password": "Sup3rSecret!",
    }
    response = client.post("/api/v1/users", json=payload, headers=auth_header(Role.SYSTEM_ADMIN))
    assert response.status_code == 409


def test_audit_log_is_for_system_admin_only(client: TestClient, auth_header) -> None:
    """Only the system administrator reads the audit trail."""
    assert (
        client.get("/api/v1/users/audit-log", headers=auth_header(Role.DOCTOR)).status_code == 403
    )
    response = client.get("/api/v1/users/audit-log", headers=auth_header(Role.SYSTEM_ADMIN))
    assert response.status_code == 200
    assert any(entry["action"] == "login" for entry in response.json())
