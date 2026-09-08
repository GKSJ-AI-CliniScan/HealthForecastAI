"""Authentication tests - Milestone 1."""

from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from tests.conftest import TEST_PASSWORD


def test_login_returns_a_token_and_permissions(client: TestClient, make_user) -> None:
    """A valid login returns a bearer token, the role, and the permission list."""
    user = make_user(Role.DOCTOR)

    response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": TEST_PASSWORD}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["role"] == "doctor"
    assert body["access_token"]
    assert "patient:read_assigned" in body["permissions"]


def test_login_is_case_insensitive_on_email(client: TestClient, make_user) -> None:
    """Email is an identifier, not a secret - casing must not matter."""
    user = make_user(Role.DOCTOR, email="Mixed.Case@HealthForecast.org")

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "mixed.case@healthforecast.org", "password": TEST_PASSWORD},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "doctor"
    assert user.email == "mixed.case@healthforecast.org"


def test_wrong_password_is_rejected(client: TestClient, make_user) -> None:
    """A bad password returns 401."""
    user = make_user(Role.DOCTOR)

    response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "not-the-password"}
    )

    assert response.status_code == 401


def test_unknown_email_gives_the_same_message_as_a_wrong_password(
    client: TestClient, make_user
) -> None:
    """The login endpoint must not reveal whether an account exists."""
    user = make_user(Role.DOCTOR)

    wrong_password = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "wrong"}
    )
    unknown_email = client.post(
        "/api/v1/auth/login", json={"email": "nobody@healthforecast.org", "password": "wrong"}
    )

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json()["detail"] == unknown_email.json()["detail"]


def test_deactivated_user_cannot_log_in(client: TestClient, db, make_user) -> None:
    """A deactivated account is refused at login."""
    user = make_user(Role.DOCTOR)
    user.is_active = False
    db.commit()

    response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": TEST_PASSWORD}
    )

    assert response.status_code == 401


def test_login_attempts_are_audited(client: TestClient, db, make_user) -> None:
    """Both a successful and a failed login leave an audit trail."""
    user = make_user(Role.DOCTOR)

    client.post("/api/v1/auth/login", json={"email": user.email, "password": TEST_PASSWORD})
    client.post("/api/v1/auth/login", json={"email": user.email, "password": "wrong"})

    entries = db.query(AuditLog).filter(AuditLog.action == "auth.login").all()
    outcomes = {entry.outcome for entry in entries}
    assert "success" in outcomes
    assert "failure" in outcomes


def test_me_returns_the_caller(client: TestClient, make_user, auth_header) -> None:
    """/auth/me returns the authenticated user's own record."""
    user = make_user(Role.HOSPITAL_ADMIN)

    response = client.get("/api/v1/auth/me", headers=auth_header(user))

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == user.email
    assert body["role"] == "hospital_admin"
    assert "hashed_password" not in body


def test_permissions_endpoint_reports_the_effective_list(
    client: TestClient, make_user, auth_header
) -> None:
    """/auth/permissions drives the frontend navigation."""
    user = make_user(Role.RESEARCHER)

    response = client.get("/api/v1/auth/permissions", headers=auth_header(user))

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "researcher"
    assert "research_dataset:export" in body["permissions"]
    assert "user:manage" not in body["permissions"]


def test_a_token_for_a_deleted_user_is_rejected(
    client: TestClient, db, make_user, auth_header
) -> None:
    """A still-valid token stops working once the user row is gone."""
    user = make_user(Role.DOCTOR)
    header = auth_header(user)

    db.delete(user)
    db.commit()

    assert client.get("/api/v1/auth/me", headers=header).status_code == 401


def test_a_token_for_a_deactivated_user_is_rejected(
    client: TestClient, db, make_user, auth_header
) -> None:
    """Deactivating a user invalidates their existing session immediately."""
    user = make_user(Role.DOCTOR)
    header = auth_header(user)

    user.is_active = False
    db.commit()

    assert client.get("/api/v1/auth/me", headers=header).status_code == 403


def test_garbage_token_is_rejected(client: TestClient) -> None:
    """A malformed bearer token returns 401, not 500."""
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
