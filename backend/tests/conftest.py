"""Shared test fixtures.

The suite runs against an in-memory SQLite database so it needs no PostgreSQL
server and leaves nothing behind. The database dependency is overridden rather
than the auth dependency, so requests exercise the real JWT and permission path.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.rbac import Role
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.user import User

TEST_PASSWORD = "Testpass123"


@pytest.fixture(name="db_session")
def db_session_fixture() -> Generator[Session, None, None]:
    """Create a fresh in-memory database for one test."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture(name="users")
def users_fixture(db_session: Session) -> dict[Role, User]:
    """Create one active account per role."""
    created: dict[Role, User] = {}
    for role in Role:
        user = User(
            email=f"{role}@hospital.example",
            full_name=f"Test {role}",
            hashed_password=hash_password(TEST_PASSWORD),
            role=str(role),
            is_active=True,
        )
        db_session.add(user)
        created[role] = user
    db_session.commit()
    for user in created.values():
        db_session.refresh(user)
    return created


@pytest.fixture(name="patients")
def patients_fixture(db_session: Session, users: dict[Role, User]) -> list[Patient]:
    """Create two patients: one assigned to the test doctor, one to nobody."""
    doctor = users[Role.DOCTOR]
    assigned = Patient(
        medical_record_number="MRN-1",
        patient_nbr=1001,
        age_group="[70-80)",
        gender="Female",
        race="Caucasian",
        primary_diagnosis="250.83",
        assigned_doctor_id=doctor.id,
    )
    unassigned = Patient(
        medical_record_number="MRN-2",
        patient_nbr=1002,
        age_group="[50-60)",
        gender="Male",
        race="Other",
        primary_diagnosis="410",
        assigned_doctor_id=None,
    )
    db_session.add_all([assigned, unassigned])
    db_session.commit()
    db_session.refresh(assigned)
    db_session.refresh(unassigned)

    db_session.add_all(
        [
            Admission(
                patient_id=assigned.id,
                encounter_id=5001,
                time_in_hospital=6,
                readmitted="<30",
                readmitted_within_30=True,
            ),
            Admission(
                patient_id=unassigned.id,
                encounter_id=5002,
                time_in_hospital=2,
                readmitted="NO",
                readmitted_within_30=False,
            ),
        ]
    )
    db_session.commit()
    return [assigned, unassigned]


@pytest.fixture(name="client")
def client_fixture(db_session: Session) -> Generator[TestClient, None, None]:
    """Build a test client backed by the in-memory database."""
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="auth_header")
def auth_header_fixture(users: dict[Role, User]):
    """Return a helper that builds an Authorization header for a given role."""

    def build(role: Role) -> dict[str, str]:
        token = create_access_token(subject=users[role].email, role=str(role))
        return {"Authorization": f"Bearer {token}"}

    return build
