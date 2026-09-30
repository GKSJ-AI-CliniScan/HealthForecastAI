"""Security hardening tests - Milestone 4.

Lockout after repeated failures, response headers, and the refusal to start in
production with a development configuration.
"""

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.services import auth_service
from tests.conftest import TEST_PASSWORD


def login(client, email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def fail(client, email: str, times: int) -> None:
    for _ in range(times):
        assert login(client, email, "wrong-password").status_code == 401


# --------------------------------------------------------------------------
# Lockout
# --------------------------------------------------------------------------


def test_the_sixth_attempt_is_refused_even_with_the_right_password(client, make_user) -> None:
    user = make_user(Role.DOCTOR)
    fail(client, user.email, auth_service.MAX_FAILED_LOGINS)

    response = login(client, user.email, TEST_PASSWORD)

    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0


def test_four_failures_do_not_lock_the_account(client, make_user) -> None:
    user = make_user(Role.DOCTOR)
    fail(client, user.email, auth_service.MAX_FAILED_LOGINS - 1)
    assert login(client, user.email, TEST_PASSWORD).status_code == 200


def test_a_success_resets_the_count(client, make_user) -> None:
    user = make_user(Role.DOCTOR)
    fail(client, user.email, auth_service.MAX_FAILED_LOGINS - 1)
    assert login(client, user.email, TEST_PASSWORD).status_code == 200
    fail(client, user.email, auth_service.MAX_FAILED_LOGINS - 1)
    assert login(client, user.email, TEST_PASSWORD).status_code == 200


def test_locking_one_account_does_not_affect_another(client, make_user) -> None:
    target, bystander = make_user(Role.DOCTOR), make_user(Role.DOCTOR)
    fail(client, target.email, auth_service.MAX_FAILED_LOGINS)
    assert login(client, bystander.email, TEST_PASSWORD).status_code == 200


def test_the_lockout_is_case_insensitive(client, make_user) -> None:
    user = make_user(Role.DOCTOR)
    fail(client, user.email.upper(), auth_service.MAX_FAILED_LOGINS)
    assert login(client, user.email, TEST_PASSWORD).status_code == 429


def test_unknown_addresses_are_limited_too(client) -> None:
    """Otherwise the lockout would reveal which addresses have an account."""
    fail(client, "nobody@example.org", auth_service.MAX_FAILED_LOGINS)
    assert login(client, "nobody@example.org", "anything").status_code == 429


def test_a_lockout_is_recorded_in_the_audit_log(client, db, make_user) -> None:
    user = make_user(Role.DOCTOR)
    fail(client, user.email, auth_service.MAX_FAILED_LOGINS)
    login(client, user.email, TEST_PASSWORD)

    assert db.query(AuditLog).filter(AuditLog.action == "auth.lockout").count() == 1


# --------------------------------------------------------------------------
# Headers
# --------------------------------------------------------------------------


def test_api_responses_are_never_cached(client, make_user, auth_header) -> None:
    doctor = make_user(Role.DOCTOR)
    response = client.get("/api/v1/patients", headers=auth_header(doctor))
    assert response.headers["cache-control"] == "no-store"


def test_every_response_carries_the_basic_hardening_headers(client) -> None:
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_cors_does_not_allow_an_unlisted_origin(client) -> None:
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in response.headers


# --------------------------------------------------------------------------
# Production configuration
# --------------------------------------------------------------------------

SAFE = {
    "ENVIRONMENT": "production",
    "DEBUG": False,
    "SECRET_KEY": "x" * 48,
    "BACKEND_CORS_ORIGINS": "https://app.example.org",
}


def settings(**overrides) -> Settings:
    return Settings(_env_file=None, **{**SAFE, **overrides})


def test_a_correct_production_configuration_starts() -> None:
    assert settings().ENVIRONMENT == "production"


@pytest.mark.parametrize(
    ("override", "fragment"),
    [
        ({"DEBUG": True}, "DEBUG"),
        ({"SECRET_KEY": "change-me-do-not-use-in-production"}, "SECRET_KEY"),
        ({"SECRET_KEY": "short"}, "SECRET_KEY"),
        ({"BACKEND_CORS_ORIGINS": "*"}, "CORS"),
    ],
)
def test_production_refuses_an_unsafe_configuration(override: dict, fragment: str) -> None:
    with pytest.raises(ValidationError, match=fragment):
        settings(**override)


def test_development_keeps_its_permissive_defaults() -> None:
    assert Settings(_env_file=None, ENVIRONMENT="development").DEBUG is True
