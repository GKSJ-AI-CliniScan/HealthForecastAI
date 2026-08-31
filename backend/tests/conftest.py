"""Shared pytest fixtures for the backend test suite.

CI runs pytest without a PostgreSQL service, so the suite binds the application to a
throwaway in-memory SQLite database built from the same SQLAlchemy metadata the
Alembic migration creates. Foreign keys are enabled explicitly because SQLite leaves
them off by default, which would otherwise let a test pass against a broken relation.

The engine is function scoped: every test gets an empty database. That matters
because requests made through the ``client`` fixture commit for real, so a shared
engine would let rows created by an endpoint test leak into the next test's
assertions.
"""

from collections.abc import Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rbac import Role
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import *  # noqa: F401,F403  - register every model with Base.metadata
from app.models.user import User


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record) -> None:
    """Turn on foreign key enforcement for SQLite connections."""
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


@pytest.fixture
def engine() -> Generator[Engine, None, None]:
    """Return an empty in-memory SQLite engine with the schema applied."""
    test_engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture
def db_session(engine: Engine) -> Generator[Session, None, None]:
    """Return a database session bound to this test's database."""
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    session = factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(engine: Engine) -> Generator[TestClient, None, None]:
    """Return a FastAPI test client sharing this test's database."""
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

    def _override_get_db() -> Generator[Session, None, None]:
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_header(engine: Engine) -> Callable[..., dict[str, str]]:
    """Return a factory that builds an Authorization header for a given role.

    The factory inserts a real user row and signs a token for it, because the
    protected routes resolve the token subject back to an account and reject one
    that does not exist. Pass an explicit ``subject`` to mint a token that
    deliberately does not match a row.
    """
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

    def _make(role: Role, subject: str | None = None) -> dict[str, str]:
        if subject is None:
            email = f"{role}.fixture@hospital.org"
            session = factory()
            try:
                user = session.query(User).filter(User.email == email).one_or_none()
                if user is None:
                    user = User(
                        email=email,
                        full_name=f"{role} fixture",
                        hashed_password="not-a-real-hash",
                        role=str(role),
                        is_active=True,
                    )
                    session.add(user)
                    session.commit()
                subject = str(user.id)
            finally:
                session.close()
        token = create_access_token(subject=subject, role=str(role))
        return {"Authorization": f"Bearer {token}"}

    return _make
