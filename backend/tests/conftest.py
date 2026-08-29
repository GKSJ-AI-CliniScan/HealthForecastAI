"""Shared pytest fixtures for the backend test suite.

Tests never touch the real Postgres database. Instead, get_db is overridden
with a session bound to an in-memory SQLite database created fresh for the
test run, so the suite passes the same way on a laptop and in CI, with no
external database required.
"""

from collections.abc import Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rbac import Role
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Import every model so its table is registered on Base.metadata before
# create_all runs below - a model that is never imported never gets a table.
from app.models import admission, audit_log, patient, prediction, treatment, user  # noqa: F401

_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)

Base.metadata.create_all(bind=_engine)


def _override_get_db() -> Generator[Session, None, None]:
    """Yield a session bound to the in-memory test database."""
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


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
