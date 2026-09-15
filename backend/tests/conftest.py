"""Shared pytest fixtures for the backend test suite."""

from collections.abc import Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 - registers all ORM models with Base.metadata
from app.core.rbac import Role
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Isolated in-memory database for unit test suite
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    """Create all database tables in memory for tests."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def override_get_db() -> Generator[Session, None, None]:
    """Provide a test database session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override real PostgreSQL get_db dependency in FastAPI app for tests
app.dependency_overrides[get_db] = override_get_db


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