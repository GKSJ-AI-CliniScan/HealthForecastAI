"""User management tests - Milestone 1 (System Administrator only)."""

from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.user import User


def test_system_admin_can_list_users(client: TestClient, make_user, auth_header) -> None:
    """The system administrator sees the user directory."""
    admin = make_user(Role.SYSTEM_ADMIN)
    make_user(Role.DOCTOR)

    response = client.get("/api/v1/users", headers=auth_header(admin))

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_users_can_be_filtered_by_role(client: TestClient, make_user, auth_header) -> None:
    """Filtering narrows the directory to one role."""
    admin = make_user(Role.SYSTEM_ADMIN)
    make_user(Role.DOCTOR)
    make_user(Role.DOCTOR)

    response = client.get("/api/v1/users", headers=auth_header(admin), params={"role": "doctor"})

    assert response.status_code == 200
    assert {item["role"] for item in response.json()} == {"doctor"}


def test_creating_a_user_hashes_the_password(
    client: TestClient, db, make_user, auth_header
) -> None:
    """A created user's password is never stored or returned in plaintext."""
    admin = make_user(Role.SYSTEM_ADMIN)

    response = client.post(
        "/api/v1/users",
        headers=auth_header(admin),
        json={
            "email": "new.doctor@healthforecast.org",
            "full_name": "New Doctor",
            "role": "doctor",
            "password": "AnotherPassw0rd!",
        },
    )

    assert response.status_code == 201
    assert "password" not in response.text

    stored = db.query(User).filter(User.email == "new.doctor@healthforecast.org").one()
    assert stored.hashed_password != "AnotherPassw0rd!"
    assert stored.hashed_password.startswith("$2")


def test_a_new_user_can_immediately_log_in(client: TestClient, make_user, auth_header) -> None:
    """The account the administrator creates actually works."""
    admin = make_user(Role.SYSTEM_ADMIN)
    client.post(
        "/api/v1/users",
        headers=auth_header(admin),
        json={
            "email": "fresh@healthforecast.org",
            "full_name": "Fresh User",
            "role": "researcher",
            "password": "FreshPassw0rd!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "fresh@healthforecast.org", "password": "FreshPassw0rd!"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "researcher"


def test_duplicate_email_is_rejected(client: TestClient, make_user, auth_header) -> None:
    """Two accounts cannot share an email - 409, not a 500."""
    admin = make_user(Role.SYSTEM_ADMIN)
    existing = make_user(Role.DOCTOR)

    response = client.post(
        "/api/v1/users",
        headers=auth_header(admin),
        json={
            "email": existing.email,
            "full_name": "Impostor",
            "role": "doctor",
            "password": "Passw0rd12345",
        },
    )

    assert response.status_code == 409


def test_short_password_is_rejected(client: TestClient, make_user, auth_header) -> None:
    """The schema enforces a minimum password length."""
    admin = make_user(Role.SYSTEM_ADMIN)

    response = client.post(
        "/api/v1/users",
        headers=auth_header(admin),
        json={
            "email": "weak@healthforecast.org",
            "full_name": "Weak",
            "role": "doctor",
            "password": "short",
        },
    )

    assert response.status_code == 422


def test_deactivating_a_user_is_audited(client: TestClient, db, make_user, auth_header) -> None:
    """Deactivation is recorded against the administrator who did it."""
    admin = make_user(Role.SYSTEM_ADMIN)
    target = make_user(Role.DOCTOR)

    response = client.post(f"/api/v1/users/{target.id}/deactivate", headers=auth_header(admin))

    assert response.status_code == 200
    assert response.json()["is_active"] is False

    entry = db.query(AuditLog).filter(AuditLog.action == "user.deactivate").one()
    assert entry.actor_id == admin.id
    assert entry.resource == f"user:{target.id}"


def test_admin_cannot_lock_themselves_out(client: TestClient, make_user, auth_header) -> None:
    """Deactivating your own account would leave the platform unmanageable."""
    admin = make_user(Role.SYSTEM_ADMIN)

    response = client.post(f"/api/v1/users/{admin.id}/deactivate", headers=auth_header(admin))

    assert response.status_code == 400


def test_deactivated_user_can_be_reactivated(client: TestClient, make_user, auth_header) -> None:
    """Reactivation restores access."""
    admin = make_user(Role.SYSTEM_ADMIN)
    target = make_user(Role.DOCTOR)

    client.post(f"/api/v1/users/{target.id}/deactivate", headers=auth_header(admin))
    response = client.post(f"/api/v1/users/{target.id}/activate", headers=auth_header(admin))

    assert response.status_code == 200
    assert response.json()["is_active"] is True


def test_missing_user_returns_404(client: TestClient, make_user, auth_header) -> None:
    """An unknown id is a 404."""
    admin = make_user(Role.SYSTEM_ADMIN)
    assert client.get("/api/v1/users/99999", headers=auth_header(admin)).status_code == 404


def test_non_admin_roles_cannot_manage_users(client: TestClient, make_user, auth_header) -> None:
    """Only the system administrator reaches user management."""
    for role in (Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.RESEARCHER):
        actor = make_user(role)
        assert client.get("/api/v1/users", headers=auth_header(actor)).status_code == 403
