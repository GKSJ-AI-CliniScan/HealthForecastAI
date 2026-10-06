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
from app.db.mongodb import close_mongo_connection
from app.db.session import get_db
from app.main import app

# Isolated in-memory database for unit test suite
TEST_DATABASE_URL = "sqlite:///:memory:"
TEST_PASSWORD = "password123"

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
    close_mongo_connection()


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


from datetime import date
from app.models.user import User
from app.models.patient import Patient
from app.models.admission import Admission
from app.core.security import hash_password

TEST_PASSWORD = "password123"

@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def users(db_session: Session) -> dict[Role, User]:
    role_users = {}
    for role in (Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.RESEARCHER, Role.SYSTEM_ADMIN):
        user = User(
            email=f"{role.value}@test.example",
            hashed_password=hash_password(TEST_PASSWORD),
            full_name=f"Test {role.value.title()}",
            role=role,
            is_active=True,
        )
        db_session.add(user)
        role_users[role] = user
    db_session.flush()
    return role_users

@pytest.fixture
def patients(db_session: Session, users: dict[Role, User]) -> list[Patient]:
    doctor = users[Role.DOCTOR]
    p1 = Patient(
        medical_record_number="MRN-1",
        age_group="[50-60)",
        gender="Male",
        primary_diagnosis="428",
        assigned_doctor_id=doctor.id,
    )
    p2 = Patient(
        medical_record_number="MRN-2",
        age_group="[60-70)",
        gender="Female",
        primary_diagnosis="250",
        assigned_doctor_id=None,
    )
    db_session.add_all([p1, p2])
    db_session.flush()
    return [p1, p2]