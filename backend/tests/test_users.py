"""User management tests.

Covers the endpoints end to end plus the two rules that only exist in the service:
email uniqueness and the refusal to remove the last active administrator.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.repositories.audit_repository import AuditRepository
from app.services.auth_service import EmailAlreadyRegisteredError
from app.services.user_service import (
    LastAdministratorError,
    UnknownFieldError,
    UserNotFoundError,
    UserService,
)

# An obvious placeholder, not a credential: the secret scan treats a literal
# password assignment as a leak unless the value reads as an example.
PASSWORD = "example-Passw0rd-1"


@pytest.fixture
def service(db_session: Session) -> UserService:
    return UserService(db_session)


def make(service: UserService, email: str, role: Role = Role.DOCTOR):
    return service.create_user(email=email, full_name="Made Person", password=PASSWORD, role=role)


def admin_header(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


# --------------------------------------------------------------------------
# Service rules
# --------------------------------------------------------------------------


def test_create_user_hashes_the_password(service: UserService) -> None:
    """The plaintext password must never be stored."""
    user = make(service, "hash.me@hospital.org")
    assert user.hashed_password != PASSWORD


def test_create_user_normalises_the_email(service: UserService) -> None:
    """Addresses are stored lowercased and trimmed."""
    assert make(service, "  Upper.Case@Hospital.ORG ").email == "upper.case@hospital.org"


def test_create_user_assigns_the_requested_role(service: UserService) -> None:
    """An administrator chooses the role; this endpoint is already restricted."""
    user = make(service, "researcher@hospital.org", Role.RESEARCHER)
    assert user.role == str(Role.RESEARCHER)


def test_create_user_rejects_a_duplicate_email(service: UserService) -> None:
    """Uniqueness is enforced before the insert is attempted."""
    make(service, "dupe@hospital.org")
    with pytest.raises(EmailAlreadyRegisteredError):
        make(service, "DUPE@hospital.org")


def test_get_user_raises_for_a_missing_id(service: UserService) -> None:
    """A missing id is an explicit error, not a None the caller must remember."""
    with pytest.raises(UserNotFoundError):
        service.get_user(9999)


def test_update_applies_only_the_supplied_fields(service: UserService) -> None:
    """A partial update must not blank fields the caller omitted."""
    user = make(service, "partial@hospital.org")
    updated = service.update_user(user.id, {"department": "Cardiology"})
    assert updated.department == "Cardiology"
    assert updated.full_name == "Made Person"
    assert updated.role == str(Role.DOCTOR)


def test_update_assigns_a_new_role(service: UserService) -> None:
    """Role assignment is an ordinary field update."""
    user = make(service, "promote@hospital.org")
    assert service.update_user(user.id, {"role": Role.HOSPITAL_ADMIN}).role == str(
        Role.HOSPITAL_ADMIN
    )


def test_update_rejects_an_unknown_field(service: UserService) -> None:
    """Only the allowlisted fields are updatable."""
    user = make(service, "fields@hospital.org")
    with pytest.raises(UnknownFieldError):
        service.update_user(user.id, {"hashed_password": "injected"})


def test_update_is_audited(service: UserService, db_session: Session) -> None:
    """Administrative changes land in the audit trail."""
    user = make(service, "audited@hospital.org")
    service.update_user(user.id, {"department": "Oncology"}, actor_id=1, actor_role="system_admin")
    actions = [e.action for e in AuditRepository(db_session).list_recent()]
    assert "user.update" in actions
    assert "user.create" in actions


# --------------------------------------------------------------------------
# The platform must never lose its last administrator
# --------------------------------------------------------------------------


def test_last_administrator_cannot_be_demoted(service: UserService) -> None:
    """Demoting the only administrator would lock everyone out of user management."""
    admin = make(service, "only.admin@hospital.org", Role.SYSTEM_ADMIN)
    with pytest.raises(LastAdministratorError):
        service.update_user(admin.id, {"role": Role.DOCTOR})


def test_last_administrator_cannot_be_deactivated(service: UserService) -> None:
    """Deactivation removes the same access a demotion would."""
    admin = make(service, "only.admin@hospital.org", Role.SYSTEM_ADMIN)
    with pytest.raises(LastAdministratorError):
        service.update_user(admin.id, {"is_active": False})


def test_an_administrator_can_be_demoted_when_another_remains(service: UserService) -> None:
    """The guard protects the last one, not administrators in general."""
    first = make(service, "admin.one@hospital.org", Role.SYSTEM_ADMIN)
    make(service, "admin.two@hospital.org", Role.SYSTEM_ADMIN)
    assert service.update_user(first.id, {"role": Role.DOCTOR}).role == str(Role.DOCTOR)


def test_an_inactive_administrator_does_not_count_as_cover(service: UserService) -> None:
    """A deactivated administrator cannot log in, so it cannot be the last one."""
    active = make(service, "active.admin@hospital.org", Role.SYSTEM_ADMIN)
    spare = make(service, "spare.admin@hospital.org", Role.SYSTEM_ADMIN)
    service.update_user(spare.id, {"is_active": False})
    with pytest.raises(LastAdministratorError):
        service.update_user(active.id, {"is_active": False})


def test_the_last_administrator_can_still_be_edited(service: UserService) -> None:
    """The guard blocks losing the role, not ordinary edits to that account."""
    admin = make(service, "only.admin@hospital.org", Role.SYSTEM_ADMIN)
    assert service.update_user(admin.id, {"full_name": "Renamed"}).full_name == "Renamed"


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------


def test_create_endpoint_returns_the_new_user(client: TestClient, auth_header) -> None:
    """POST /users returns 201 and never echoes a credential."""
    response = client.post(
        "/api/v1/users",
        headers=admin_header(auth_header),
        json={
            "email": "api.create@hospital.org",
            "full_name": "Api Create",
            "password": PASSWORD,
            "role": "researcher",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "researcher"
    assert "password" not in body
    assert "hashed_password" not in body


def test_create_endpoint_is_no_longer_a_501(client: TestClient, auth_header) -> None:
    """The Milestone 1 stub is gone."""
    response = client.post(
        "/api/v1/users",
        headers=admin_header(auth_header),
        json={"email": "a@hospital.org", "full_name": "A", "password": PASSWORD},
    )
    assert response.status_code != 501


def test_create_endpoint_rejects_a_duplicate(client: TestClient, auth_header) -> None:
    """A repeated address returns 409."""
    payload = {"email": "api.dupe@hospital.org", "full_name": "Dupe", "password": PASSWORD}
    header = admin_header(auth_header)
    assert client.post("/api/v1/users", headers=header, json=payload).status_code == 201
    assert client.post("/api/v1/users", headers=header, json=payload).status_code == 409


def test_list_endpoint_returns_created_users(client: TestClient, auth_header) -> None:
    """The list reflects what was created, and reports a total for pagination."""
    header = admin_header(auth_header)
    for index in range(3):
        client.post(
            "/api/v1/users",
            headers=header,
            json={
                "email": f"listed{index}@hospital.org",
                "full_name": f"Listed {index}",
                "password": PASSWORD,
            },
        )
    response = client.get("/api/v1/users", headers=header)
    assert response.status_code == 200
    # Three created here plus the fixture's own administrator account.
    assert response.headers["X-Total-Count"] == "4"
    assert len(response.json()) == 4


def test_list_endpoint_filters_by_role(client: TestClient, auth_header) -> None:
    """Filtering narrows both the page and the reported total."""
    header = admin_header(auth_header)
    client.post(
        "/api/v1/users",
        headers=header,
        json={
            "email": "filtered@hospital.org",
            "full_name": "Filtered",
            "password": PASSWORD,
            "role": "researcher",
        },
    )
    response = client.get("/api/v1/users?role=researcher", headers=header)
    assert response.headers["X-Total-Count"] == "1"
    assert [u["email"] for u in response.json()] == ["filtered@hospital.org"]


def test_list_endpoint_paginates(client: TestClient, auth_header) -> None:
    """limit and offset return disjoint pages."""
    header = admin_header(auth_header)
    for index in range(4):
        client.post(
            "/api/v1/users",
            headers=header,
            json={
                "email": f"page{index}@hospital.org",
                "full_name": f"Page {index}",
                "password": PASSWORD,
            },
        )
    first = client.get("/api/v1/users?limit=2&offset=0", headers=header).json()
    second = client.get("/api/v1/users?limit=2&offset=2", headers=header).json()
    assert {u["id"] for u in first}.isdisjoint({u["id"] for u in second})


def test_get_endpoint_returns_one_user(client: TestClient, auth_header) -> None:
    """GET /users/{id} returns the requested record."""
    header = admin_header(auth_header)
    created = client.post(
        "/api/v1/users",
        headers=header,
        json={"email": "one@hospital.org", "full_name": "One", "password": PASSWORD},
    ).json()
    response = client.get(f"/api/v1/users/{created['id']}", headers=header)
    assert response.status_code == 200
    assert response.json()["email"] == "one@hospital.org"


def test_get_endpoint_returns_404_for_a_missing_user(client: TestClient, auth_header) -> None:
    """An unknown id is a 404, not a 500."""
    assert client.get("/api/v1/users/9999", headers=admin_header(auth_header)).status_code == 404


def test_patch_endpoint_updates_and_assigns_roles(client: TestClient, auth_header) -> None:
    """PATCH /users/{id} changes only what it is given."""
    header = admin_header(auth_header)
    created = client.post(
        "/api/v1/users",
        headers=header,
        json={"email": "patch.me@hospital.org", "full_name": "Patch Me", "password": PASSWORD},
    ).json()
    response = client.patch(
        f"/api/v1/users/{created['id']}",
        headers=header,
        json={"role": "hospital_admin", "department": "Operations"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "hospital_admin"
    assert body["department"] == "Operations"
    assert body["full_name"] == "Patch Me"


def test_patch_endpoint_rejects_an_empty_body(client: TestClient, auth_header) -> None:
    """An update that changes nothing is a client error, not a silent no-op."""
    header = admin_header(auth_header)
    created = client.post(
        "/api/v1/users",
        headers=header,
        json={"email": "empty@hospital.org", "full_name": "Empty", "password": PASSWORD},
    ).json()
    response = client.patch(f"/api/v1/users/{created['id']}", headers=header, json={})
    assert response.status_code == 400


def test_patch_endpoint_rejects_an_invalid_role(client: TestClient, auth_header) -> None:
    """A role outside the access matrix is refused by validation."""
    header = admin_header(auth_header)
    created = client.post(
        "/api/v1/users",
        headers=header,
        json={"email": "badrole@hospital.org", "full_name": "Bad Role", "password": PASSWORD},
    ).json()
    response = client.patch(
        f"/api/v1/users/{created['id']}", headers=header, json={"role": "nurse"}
    )
    assert response.status_code == 422


def test_patch_endpoint_refuses_to_remove_the_last_administrator(
    client: TestClient, auth_header
) -> None:
    """The lockout guard surfaces as a 409 rather than a 500."""
    header = admin_header(auth_header)
    listing = client.get("/api/v1/users?role=system_admin", headers=header).json()
    admin_id = listing[0]["id"]
    response = client.patch(f"/api/v1/users/{admin_id}", headers=header, json={"role": "doctor"})
    assert response.status_code == 409


@pytest.mark.parametrize("role", [Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.RESEARCHER])
def test_non_administrators_cannot_reach_any_user_endpoint(
    client: TestClient, auth_header, role: Role
) -> None:
    """Every verb on /users is system administrator only."""
    header = auth_header(role)
    assert client.get("/api/v1/users", headers=header).status_code == 403
    assert client.get("/api/v1/users/1", headers=header).status_code == 403
    assert (
        client.patch("/api/v1/users/1", headers=header, json={"department": "X"}).status_code == 403
    )
    assert (
        client.post(
            "/api/v1/users",
            headers=header,
            json={"email": "x@hospital.org", "full_name": "X", "password": PASSWORD},
        ).status_code
        == 403
    )
