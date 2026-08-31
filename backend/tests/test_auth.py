"""Authentication tests.

Covers the service directly (registration rules, credential checking, audit
writes) and the endpoints end to end (status codes, response shapes).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import decode_token
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import (
    AuthError,
    AuthService,
    EmailAlreadyRegisteredError,
    InactiveAccountError,
)

# An obvious placeholder, not a credential: the secret scan treats a literal
# password assignment as a leak unless the value reads as an example.
PASSWORD = "example-Passw0rd-1"


@pytest.fixture
def service(db_session: Session) -> AuthService:
    return AuthService(db_session)


@pytest.fixture
def audit(db_session: Session) -> AuditRepository:
    return AuditRepository(db_session)


def register(service: AuthService, email: str, password: str = PASSWORD):
    return service.register(email=email, full_name="Test Person", password=password)


# --------------------------------------------------------------------------
# Registration
# --------------------------------------------------------------------------


def test_first_account_bootstraps_the_system_administrator(service: AuthService) -> None:
    """An empty database has no administrator, so the first account becomes one."""
    user = register(service, "first@hospital.org")
    assert user.role == str(Role.SYSTEM_ADMIN)


def test_later_accounts_are_doctors(service: AuthService) -> None:
    """Only the bootstrap account is privileged; the rest get the lowest role."""
    register(service, "first@hospital.org")
    second = register(service, "second@hospital.org")
    third = register(service, "third@hospital.org")
    assert second.role == str(Role.DOCTOR)
    assert third.role == str(Role.DOCTOR)


def test_registration_stores_a_hash_not_the_password(service: AuthService) -> None:
    """The plaintext password must never reach the database."""
    user = register(service, "hashed@hospital.org")
    assert user.hashed_password != PASSWORD
    assert PASSWORD not in user.hashed_password


def test_registration_normalises_the_email(service: AuthService) -> None:
    """Addresses are stored lowercased and trimmed so logins cannot split."""
    user = register(service, "  Mixed.Case@Hospital.ORG  ")
    assert user.email == "mixed.case@hospital.org"


def test_duplicate_registration_is_rejected(service: AuthService) -> None:
    """A second registration for the same address fails rather than shadowing."""
    register(service, "dupe@hospital.org")
    with pytest.raises(EmailAlreadyRegisteredError):
        register(service, "DUPE@hospital.org")


def test_registration_is_audited(service: AuthService, audit: AuditRepository) -> None:
    """FR-AUD-01: the account creation lands in the audit trail."""
    user = register(service, "audited@hospital.org")
    entries = audit.list_for_actor(user.id)
    assert [e.action for e in entries] == ["user.register"]
    assert entries[0].outcome == "success"


# --------------------------------------------------------------------------
# Authentication
# --------------------------------------------------------------------------


def test_correct_credentials_authenticate(service: AuthService) -> None:
    """The happy path returns the matching user."""
    created = register(service, "good@hospital.org")
    assert service.authenticate("good@hospital.org", PASSWORD).id == created.id


def test_login_is_case_insensitive_on_email(service: AuthService) -> None:
    """Capitalisation in the login form does not lock a user out."""
    register(service, "case@hospital.org")
    assert service.authenticate("CASE@HOSPITAL.ORG", PASSWORD) is not None


def test_wrong_password_is_rejected(service: AuthService) -> None:
    """A bad password fails even for a known address."""
    register(service, "wrong@hospital.org")
    with pytest.raises(AuthError):
        service.authenticate("wrong@hospital.org", "not-the-password")


def test_unknown_email_is_rejected(service: AuthService) -> None:
    """An unknown address fails the same way a wrong password does."""
    with pytest.raises(AuthError):
        service.authenticate("ghost@hospital.org", PASSWORD)


def test_unknown_email_and_wrong_password_are_indistinguishable(service: AuthService) -> None:
    """Neither message reveals whether an address is registered."""
    register(service, "known@hospital.org")
    with pytest.raises(AuthError) as unknown:
        service.authenticate("nobody@hospital.org", PASSWORD)
    with pytest.raises(AuthError) as bad_password:
        service.authenticate("known@hospital.org", "nope")
    assert str(unknown.value) == str(bad_password.value)


def test_deactivated_account_cannot_log_in(service: AuthService, db_session: Session) -> None:
    """Correct credentials on a disabled account are still refused."""
    user = register(service, "disabled@hospital.org")
    UserRepository(db_session).update(user, is_active=False)
    with pytest.raises(InactiveAccountError):
        service.authenticate("disabled@hospital.org", PASSWORD)


def test_failed_login_is_audited(service: AuthService, audit: AuditRepository) -> None:
    """A failed attempt is the entry an investigation needs, so it must be written."""
    register(service, "trail@hospital.org")
    with pytest.raises(AuthError):
        service.authenticate("trail@hospital.org", "wrong")
    failures = [e for e in audit.list_recent() if e.outcome == "failure"]
    assert [e.action for e in failures] == ["auth.login"]


def test_failed_login_for_unknown_email_is_audited(
    service: AuthService, audit: AuditRepository
) -> None:
    """An attempt against a non existent address is still recorded."""
    with pytest.raises(AuthError):
        service.authenticate("ghost@hospital.org", PASSWORD)
    entries = audit.list_recent()
    assert entries[0].action == "auth.login"
    assert entries[0].outcome == "failure"
    assert entries[0].actor_id is None


# --------------------------------------------------------------------------
# Token issuance
# --------------------------------------------------------------------------


def test_token_subject_is_the_user_id(service: AuthService) -> None:
    """Doctor scoping resolves the subject back to a row, so it must be the id."""
    user = register(service, "subject@hospital.org")
    claims = decode_token(service.issue_token(user).access_token)
    assert claims["sub"] == str(user.id)
    assert claims["role"] == user.role


def test_token_carries_the_role_permission_set(service: AuthService) -> None:
    """The client receives the permissions its role actually holds."""
    register(service, "first@hospital.org")
    doctor = register(service, "doc@hospital.org")
    issued = service.issue_token(doctor)
    assert issued.role == str(Role.DOCTOR)
    assert "patient:read_assigned" in issued.permissions
    assert "user:manage" not in issued.permissions


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------


def test_register_endpoint_creates_an_account(client: TestClient) -> None:
    """POST /auth/register returns 201 and the created user."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "api.register@hospital.org",
            "full_name": "Api Register",
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "api.register@hospital.org"
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_endpoint_rejects_a_duplicate(client: TestClient) -> None:
    """A repeated address returns 409 rather than a 500."""
    payload = {
        "email": "api.dupe@hospital.org",
        "full_name": "Api Dupe",
        "password": PASSWORD,
    }
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409


def test_register_endpoint_rejects_a_short_password(client: TestClient) -> None:
    """Password length is validated before anything is written."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "api.short@hospital.org", "full_name": "Short", "password": "abc"},
    )
    assert response.status_code == 422


def test_register_endpoint_ignores_a_role_the_caller_supplies(client: TestClient) -> None:
    """A registration cannot ask for a privileged role.

    The first registration takes the bootstrap administrator slot, so the
    escalation attempt is made by the second caller - the situation a real
    attacker would be in.
    """
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "api.bootstrap@hospital.org",
            "full_name": "Api Bootstrap",
            "password": PASSWORD,
        },
    )
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "api.escalate@hospital.org",
            "full_name": "Api Escalate",
            "password": PASSWORD,
            "role": "system_admin",
        },
    )
    assert response.status_code == 201
    assert response.json()["role"] == "doctor"


def test_login_endpoint_returns_a_usable_token(client: TestClient) -> None:
    """POST /auth/login issues a token that the protected routes accept."""
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "api.login@hospital.org",
            "full_name": "Api Login",
            "password": PASSWORD,
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "api.login@hospital.org", "password": PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"

    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["profile"]["email"] == "api.login@hospital.org"


def test_login_endpoint_rejects_bad_credentials(client: TestClient) -> None:
    """A wrong password is a 401, not a 500 and not a 200."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "api.bad@hospital.org", "full_name": "Api Bad", "password": PASSWORD},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "api.bad@hospital.org", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_endpoint_rejects_an_unknown_account(client: TestClient) -> None:
    """An unregistered address gets the same 401 as a wrong password."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "api.ghost@hospital.org", "password": PASSWORD},
    )
    assert response.status_code == 401


def test_login_is_no_longer_a_501(client: TestClient) -> None:
    """The Milestone 1 stub is gone."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "anyone@hospital.org", "password": PASSWORD},
    )
    assert response.status_code != 501
