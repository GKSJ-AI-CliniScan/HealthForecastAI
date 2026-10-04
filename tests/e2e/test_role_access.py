import httpx

from app.core.rbac import Role
from app.core.security import create_access_token


BASE_URL = "http://127.0.0.1:8000"

ROLES = [
    Role.DOCTOR,
    Role.HOSPITAL_ADMIN,
    Role.RESEARCHER,
    Role.SYSTEM_ADMIN,
]


def get_token(role: Role) -> str:
    return create_access_token(
        subject=f"e2e-{role.value}@example.com",
        role=role.value,
    )


def test_all_roles_can_access_their_identity():
    with httpx.Client(
        base_url=BASE_URL,
        timeout=10.0,
        trust_env=False,
    ) as client:
        for role in ROLES:
            response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {get_token(role)}"},
            )

            assert response.status_code == 200, (
                f"{role.value} received "
                f"{response.status_code}: {response.text}"
            )

            assert response.json()["role"] == role.value


def test_rbac_access_matrix():
    with httpx.Client(
        base_url=BASE_URL,
        timeout=10.0,
        trust_env=False,
    ) as client:

        # Treatment report:
        # Doctor has limited treatment access.
        # Hospital Admin, Researcher and System Admin have full access.
        treatment_expected = {
            Role.DOCTOR: 403,
            Role.HOSPITAL_ADMIN: 200,
            Role.RESEARCHER: 200,
            Role.SYSTEM_ADMIN: 200,
        }

        # Care recommendations:
        # Only Doctor and System Admin have this permission.
        recommendations_expected = {
            Role.DOCTOR: 200,
            Role.HOSPITAL_ADMIN: 403,
            Role.RESEARCHER: 403,
            Role.SYSTEM_ADMIN: 200,
        }

        for role in ROLES:
            headers = {
                "Authorization": f"Bearer {get_token(role)}"
            }

            treatment_response = client.get(
                "/api/v1/treatment",
                headers=headers,
            )

            assert treatment_response.status_code == treatment_expected[role], (
                f"{role.value} treatment access returned "
                f"{treatment_response.status_code}"
            )

            recommendations_response = client.get(
                "/api/v1/clinical-support/recommendations/1",
                headers=headers,
            )

            assert recommendations_response.status_code == recommendations_expected[
                role
            ], (
                f"{role.value} recommendations access returned "
                f"{recommendations_response.status_code}"
            )