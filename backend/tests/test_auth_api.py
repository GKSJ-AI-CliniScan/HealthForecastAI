"""End-to-end tests for the authentication endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import create_access_token
from app.models.user import User
from tests.conftest import TEST_PASSWORD


def test_login_returns_a_token_and_the_user(client: TestClient, users: dict[Role, User]) -> None:
    """A valid password exchanges for a bearer token."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": users[Role.DOCTOR].email, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "doctor"
    assert "hashed_password" not in body["user"]


def test_wrong_password_is_rejected(client: TestClient, users: dict[Role, User]) -> None:
    """A bad password returns 401 without revealing which field was wrong."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": users[Role.DOCTOR].email, "password": "Wrongpass123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_unknown_email_gives_the_same_message(client: TestClient) -> None:
    """Identical wording stops an attacker enumerating valid accounts."""
    response = client.post(
        "/api/v1/auth/login", json={"email": "ghost@hospital.example", "password": "Whatever123"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_short_password_fails_validation(client: TestClient) -> None:
    """Schema validation rejects the request before any database work."""
    response = client.post(
        "/api/v1/auth/login", json={"email": "a@hospital.example", "password": "short"}
    )
    assert response.status_code == 422


def test_me_requires_a_token(client: TestClient) -> None:
    """An unauthenticated call is refused."""
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_permissions(client: TestClient, auth_header) -> None:
    """The frontend shapes its navigation from this list."""
    response = client.get("/api/v1/auth/me", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "researcher"
    assert "patient:read_anonymized" in body["permissions"]
    assert "patient:read_all" not in body["permissions"]


def test_disabled_account_cannot_use_an_existing_token(
    client: TestClient, db_session: Session, users: dict[Role, User], auth_header
) -> None:
    """Disabling an account takes effect immediately, not when the token expires.

    This is the reason every guarded request reloads the user from the database
    instead of trusting the claims inside the token.
    """
    header = auth_header(Role.DOCTOR)
    assert client.get("/api/v1/patients", headers=header).status_code == 200

    users[Role.DOCTOR].is_active = False
    db_session.commit()

    response = client.get("/api/v1/patients", headers=header)
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is disabled"


def test_token_with_an_unknown_role_is_rejected(client: TestClient) -> None:
    """An invalid role must fail closed rather than fall back to a clinical role."""
    token = create_access_token(subject="doctor@hospital.example", role="nurse")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Unknown role"


def test_token_for_a_deleted_user_is_rejected(client: TestClient) -> None:
    """A correctly signed token for a non-existent account grants nothing."""
    token = create_access_token(subject="ghost@hospital.example", role="doctor")
    response = client.get("/api/v1/patients", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_only_system_admin_can_register_users(client: TestClient, auth_header) -> None:
    """Account creation is an administrative action, not a public signup."""
    payload = {
        "email": "new.doctor@hospital.example",
        "full_name": "New Doctor",
        "password": "Newpass123",
        "role": "doctor",
    }
    denied = client.post("/api/v1/auth/register", json=payload, headers=auth_header(Role.DOCTOR))
    assert denied.status_code == 403

    allowed = client.post(
        "/api/v1/auth/register", json=payload, headers=auth_header(Role.SYSTEM_ADMIN)
    )
    assert allowed.status_code == 201
    assert allowed.json()["email"] == "new.doctor@hospital.example"


def test_registration_rejects_a_password_without_digits(client: TestClient, auth_header) -> None:
    """The complexity rule lives in the schema and applies to every caller."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@hospital.example",
            "full_name": "Weak Password",
            "password": "onlyletters",
            "role": "doctor",
        },
        headers=auth_header(Role.SYSTEM_ADMIN),
    )
    assert response.status_code == 422


def test_registration_rejects_a_role_outside_the_matrix(client: TestClient, auth_header) -> None:
    """Roles from other systems must not leak into this one."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "nurse@hospital.example",
            "full_name": "Nurse",
            "password": "Nursepass1",
            "role": "nurse",
        },
        headers=auth_header(Role.SYSTEM_ADMIN),
    )
    assert response.status_code == 422


def test_duplicate_email_conflicts(
    client: TestClient, users: dict[Role, User], auth_header
) -> None:
    """Re-registering an existing address returns 409, not a second account."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": users[Role.DOCTOR].email,
            "full_name": "Duplicate",
            "password": "Duplicate1",
            "role": "doctor",
        },
        headers=auth_header(Role.SYSTEM_ADMIN),
    )
    assert response.status_code == 409


def test_roles_endpoint_lists_the_access_matrix(client: TestClient) -> None:
    """The documented matrix and the enforced one come from the same source."""
    response = client.get("/api/v1/auth/roles")
    assert response.status_code == 200
    roles = {entry["role"] for entry in response.json()}
    assert roles == {"doctor", "hospital_admin", "researcher", "system_admin"}
