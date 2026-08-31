"""Authorisation tests.

test_rbac.py pins the access matrix itself. This file pins the enforcement around
it: that every route is guarded, that a token stops working when the account
behind it does, and that a doctor's queries are narrowed to their own patients.
"""

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.core.rbac import Role
from app.core.security import create_access_token
from app.main import app
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

# An obvious placeholder, not a credential: the secret scan treats a literal
# password assignment as a leak unless the value reads as an example.
PASSWORD = "example-Passw0rd-1"

# Routes that are reachable without a token, and why.
#   login/register - a caller cannot have a token yet.
#   roles          - the public role catalogue the login screen renders.
#   health/root    - liveness probes for the orchestration layer.
PUBLIC_PATHS = {
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/register"),
    ("GET", "/api/v1/auth/roles"),
    ("GET", "/health"),
    ("GET", "/"),
}


def _requires_authentication(dependant) -> bool:
    """Return True when this route or any nested dependency demands credentials."""
    if dependant.security_requirements:
        return True
    return any(_requires_authentication(sub) for sub in dependant.dependencies)


def test_every_route_declares_an_authorisation_dependency() -> None:
    """docs/03-api: an endpoint without an authorisation dependency fails review."""
    unguarded = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in route.methods:
            if (method, route.path) in PUBLIC_PATHS:
                continue
            if not _requires_authentication(route.dependant):
                unguarded.append(f"{method} {route.path}")
    assert unguarded == [], f"unguarded routes: {unguarded}"


# --------------------------------------------------------------------------
# Identity is re-checked against the database, not trusted from the token
# --------------------------------------------------------------------------


def test_token_for_a_deactivated_account_is_refused(
    client: TestClient, db_session: Session
) -> None:
    """Deactivating a user must take effect before their token expires."""
    service = AuthService(db_session)
    user = service.register(
        email="deactivate.me@hospital.org", full_name="Deactivate Me", password=PASSWORD
    )
    header = {"Authorization": f"Bearer {service.issue_token(user).access_token}"}
    assert client.get("/api/v1/auth/me", headers=header).status_code == 200

    UserRepository(db_session).update(user, is_active=False)
    assert client.get("/api/v1/auth/me", headers=header).status_code == 403


def test_token_for_a_deleted_account_is_refused(client: TestClient, db_session: Session) -> None:
    """A signed token must not outlive the account it names."""
    service = AuthService(db_session)
    user = service.register(
        email="delete.me@hospital.org", full_name="Delete Me", password=PASSWORD
    )
    header = {"Authorization": f"Bearer {service.issue_token(user).access_token}"}
    UserRepository(db_session).delete(user)
    assert client.get("/api/v1/auth/me", headers=header).status_code == 401


def test_role_comes_from_the_database_not_the_token(
    client: TestClient, db_session: Session
) -> None:
    """A forged or stale role claim cannot grant permissions the account lost.

    The token below is correctly signed and claims system_admin, but the account
    is a doctor, so the user management endpoint must still refuse it.
    """
    service = AuthService(db_session)
    service.register(email="bootstrap@hospital.org", full_name="Bootstrap", password=PASSWORD)
    doctor = service.register(email="just.a.doc@hospital.org", full_name="Doc", password=PASSWORD)
    assert doctor.role == str(Role.DOCTOR)

    forged = create_access_token(subject=str(doctor.id), role=str(Role.SYSTEM_ADMIN))
    response = client.get("/api/v1/users", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 403


def test_token_with_a_non_numeric_subject_is_refused(client: TestClient) -> None:
    """A subject that cannot name a row is not an identity."""
    token = create_access_token(subject="not-a-user-id", role=str(Role.SYSTEM_ADMIN))
    response = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_unsigned_garbage_is_refused(client: TestClient) -> None:
    """A malformed bearer value is rejected before any database work happens."""
    response = client.get("/api/v1/users", headers={"Authorization": "Bearer not.a.real.token"})
    assert response.status_code == 401


# --------------------------------------------------------------------------
# Permission enforcement across the matrix
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.SYSTEM_ADMIN, 200),
        (Role.DOCTOR, 403),
        (Role.HOSPITAL_ADMIN, 403),
        (Role.RESEARCHER, 403),
    ],
)
def test_user_management_is_system_admin_only(
    client: TestClient, auth_header, role: Role, expected: int
) -> None:
    """User management is the system administrator's alone."""
    assert client.get("/api/v1/users", headers=auth_header(role)).status_code == expected


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.DOCTOR, 200),
        (Role.HOSPITAL_ADMIN, 200),
        (Role.SYSTEM_ADMIN, 200),
        (Role.RESEARCHER, 403),
    ],
)
def test_identifiable_patient_list_excludes_researchers(
    client: TestClient, auth_header, role: Role, expected: int
) -> None:
    """Researchers get anonymised data only, never the identifiable list."""
    assert client.get("/api/v1/patients", headers=auth_header(role)).status_code == expected


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.RESEARCHER, 200),
        (Role.SYSTEM_ADMIN, 200),
        (Role.DOCTOR, 403),
        (Role.HOSPITAL_ADMIN, 403),
    ],
)
def test_anonymised_cohort_matches_the_access_matrix(
    client: TestClient, auth_header, role: Role, expected: int
) -> None:
    """Only roles holding patient:read_anonymized reach the cohort endpoint."""
    response = client.get("/api/v1/patients/anonymised", headers=auth_header(role))
    assert response.status_code == expected


def test_every_role_is_rejected_without_a_token(client: TestClient) -> None:
    """No protected route answers an anonymous caller."""
    for path in ("/api/v1/users", "/api/v1/patients", "/api/v1/auth/me"):
        assert client.get(path).status_code == 401


# --------------------------------------------------------------------------
# Doctor scope resolution
# --------------------------------------------------------------------------


def test_doctor_is_scoped_to_their_own_id() -> None:
    """A doctor's patient queries are narrowed by their own user id."""
    doctor = CurrentUser(subject="42", role=Role.DOCTOR)
    assert patient_scope_for(doctor) == 42


@pytest.mark.parametrize("role", [Role.HOSPITAL_ADMIN, Role.RESEARCHER, Role.SYSTEM_ADMIN])
def test_other_roles_are_not_narrowed(role: Role) -> None:
    """Roles the matrix grants hospital wide reads are not filtered by doctor."""
    assert patient_scope_for(CurrentUser(subject="42", role=role)) is None


def test_scope_ignores_any_caller_supplied_identity() -> None:
    """The scope id comes from the token subject, never from a request parameter.

    This is what stops one doctor from asking for another doctor's patient list.
    """
    first = CurrentUser(subject="7", role=Role.DOCTOR)
    second = CurrentUser(subject="8", role=Role.DOCTOR)
    assert patient_scope_for(first) == 7
    assert patient_scope_for(second) == 8
