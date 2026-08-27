"""Access matrix tests.

These encode the restrictions from section 4 of the project brief. Interns may add
permissions, but a change that makes one of these tests fail is a security
regression and must not be merged.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.rbac import PERMISSIONS, Permission, Role, has_permission, permissions_for


def test_every_role_has_a_permission_set() -> None:
    """No role may be left without an explicit permission set."""
    for role in Role:
        assert role in PERMISSIONS, f"{role} has no entry in PERMISSIONS"


def test_system_admin_has_every_permission() -> None:
    """The system administrator has no restrictions."""
    for permission in Permission:
        assert has_permission(Role.SYSTEM_ADMIN, permission)


@pytest.mark.parametrize(
    ("role", "forbidden"),
    [
        (Role.DOCTOR, Permission.USER_MANAGE),
        (Role.DOCTOR, Permission.MODEL_MANAGE),
        (Role.DOCTOR, Permission.PATIENT_READ_ALL),
        (Role.HOSPITAL_ADMIN, Permission.PATIENT_WRITE),
        (Role.HOSPITAL_ADMIN, Permission.MODEL_MANAGE),
        (Role.HOSPITAL_ADMIN, Permission.USER_MANAGE),
        (Role.RESEARCHER, Permission.PATIENT_READ_ALL),
        (Role.RESEARCHER, Permission.PATIENT_WRITE),
        (Role.RESEARCHER, Permission.USER_MANAGE),
        (Role.RESEARCHER, Permission.MODEL_MANAGE),
    ],
)
def test_role_restrictions_hold(role: Role, forbidden: Permission) -> None:
    """Restricted capabilities stay restricted."""
    assert not has_permission(role, forbidden), f"{role} must not hold {forbidden}"


def test_researcher_never_sees_identifiable_patients() -> None:
    """Researchers get anonymised access only - never raw patient records."""
    granted = PERMISSIONS[Role.RESEARCHER]
    assert Permission.PATIENT_READ_ANONYMIZED in granted
    assert Permission.PATIENT_READ_ASSIGNED not in granted
    assert Permission.PATIENT_READ_ALL not in granted


def test_permissions_for_returns_sorted_strings() -> None:
    """The permission list exposed over the API is stable and sorted."""
    result = permissions_for(Role.DOCTOR)
    assert result == sorted(result)
    assert all(isinstance(item, str) for item in result)


def test_unauthenticated_request_is_rejected(client: TestClient) -> None:
    """Protected endpoints reject callers without a token."""
    assert client.get("/api/v1/users").status_code == 401
    assert client.get("/api/v1/analytics/summary").status_code == 401


def test_doctor_cannot_manage_users(client: TestClient, auth_header) -> None:
    """A doctor calling a system administrator endpoint gets 403."""
    response = client.get("/api/v1/users", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403


def test_system_admin_can_list_users(client: TestClient, auth_header) -> None:
    """A system administrator reaches the user management endpoint."""
    response = client.get("/api/v1/users", headers=auth_header(Role.SYSTEM_ADMIN))
    assert response.status_code == 200


def test_researcher_is_pushed_to_the_anonymised_endpoint(
    client: TestClient, auth_header
) -> None:
    """Researchers must not reach the identifiable patient list."""
    response = client.get("/api/v1/patients", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 403


def test_me_endpoint_reports_effective_permissions(
    client: TestClient, auth_header
) -> None:
    """/auth/me returns the caller's role and permission list."""
    response = client.get("/api/v1/auth/me", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "hospital_admin"
    assert "hospital_analytics:read" in body["permissions"]
