"""Access matrix tests.

These encode the restrictions from section 4 of the project brief. Interns may
add permissions, but a change that makes one of these fail is a security
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
        (Role.DOCTOR, Permission.HOSPITAL_ANALYTICS_READ),
        (Role.HOSPITAL_ADMIN, Permission.PATIENT_WRITE),
        (Role.HOSPITAL_ADMIN, Permission.MODEL_MANAGE),
        (Role.HOSPITAL_ADMIN, Permission.USER_MANAGE),
        (Role.HOSPITAL_ADMIN, Permission.POPULATION_HEALTH_READ),
        (Role.RESEARCHER, Permission.PATIENT_READ_ALL),
        (Role.RESEARCHER, Permission.PATIENT_READ_ASSIGNED),
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


# --------------------------------------------------------------------------
# The same matrix, enforced end to end through the API.
# --------------------------------------------------------------------------

# endpoint -> the roles that are allowed to reach it
ENDPOINT_MATRIX: list[tuple[str, set[Role]]] = [
    ("/api/v1/users", {Role.SYSTEM_ADMIN}),
    ("/api/v1/patients", {Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN}),
    ("/api/v1/patients/anonymised", {Role.RESEARCHER, Role.SYSTEM_ADMIN}),
    (
        "/api/v1/analytics/summary",
        {Role.HOSPITAL_ADMIN, Role.RESEARCHER, Role.SYSTEM_ADMIN},
    ),
    ("/api/v1/analytics/population-health", {Role.RESEARCHER, Role.SYSTEM_ADMIN}),
    ("/api/v1/models", {Role.SYSTEM_ADMIN}),
    ("/api/v1/risk/high-risk", {Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN}),
]


@pytest.mark.parametrize(("path", "allowed"), ENDPOINT_MATRIX)
def test_endpoint_access_matches_the_matrix(
    path: str, allowed: set[Role], client: TestClient, make_user, auth_header
) -> None:
    """Every role gets exactly the endpoints the brief grants it."""
    for role in Role:
        actor = make_user(role)
        response = client.get(path, headers=auth_header(actor))

        if role in allowed:
            assert (
                response.status_code == 200
            ), f"{role} should reach {path} but got {response.status_code}"
        else:
            assert (
                response.status_code == 403
            ), f"{role} should be refused {path} but got {response.status_code}"


@pytest.mark.parametrize(("path", "_allowed"), ENDPOINT_MATRIX)
def test_every_endpoint_requires_authentication(
    path: str, _allowed: set[Role], client: TestClient
) -> None:
    """No endpoint in the matrix is reachable without a token."""
    assert client.get(path).status_code == 401


def test_dashboard_is_open_to_every_authenticated_role(
    client: TestClient, make_user, auth_header
) -> None:
    """Every role lands on a dashboard - the numbers behind it are scoped."""
    for role in Role:
        actor = make_user(role)
        response = client.get("/api/v1/analytics/dashboard", headers=auth_header(actor))
        assert response.status_code == 200, f"{role} cannot load their dashboard"
