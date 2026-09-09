"""Shared pytest fixtures for the backend test suite."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.core.security import create_access_token
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Return a FastAPI test client bound to the application."""
    return TestClient(app)


@pytest.fixture
def auth_header() -> Callable[..., dict[str, str]]:
    """Return a factory that builds an Authorization header for a given role."""

    def _make(role: Role, subject: str = "test-user") -> dict[str, str]:
        token = create_access_token(subject=subject, role=str(role))
        return {"Authorization": f"Bearer {token}"}

    return _make
