"""Pytest configuration and test fixtures for HealthForecast AI."""

import uuid
from collections.abc import Generator
from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import (
    Role,
    User,
    Patient,
    DoctorPatientAssignment,
    MedicalHistory,
    Admission,
    Treatment,
    AuditLog,
)

# In-memory SQLite for fast, isolated tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in memory once for the test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a clean, seeded transactional session for each test function."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Seed base roles
    roles = {
        "DOCTOR": Role(id=uuid.uuid4(), name="DOCTOR", description="Doctor"),
        "HOSPITAL_ADMIN": Role(id=uuid.uuid4(), name="HOSPITAL_ADMIN", description="Admin"),
        "RESEARCHER": Role(id=uuid.uuid4(), name="RESEARCHER", description="Researcher"),
        "SYSTEM_ADMIN": Role(id=uuid.uuid4(), name="SYSTEM_ADMIN", description="SysAdmin"),
    }
    for r in roles.values():
        session.add(r)
    session.flush()

    pwd = hash_password("HealthForecast2026!")

    # Seed demo users
    doctor_user = User(
        id=uuid.uuid4(),
        email="doctor@test.com",
        username="dr.test",
        password_hash=pwd,
        first_name="Doctor",
        last_name="Test",
        role_id=roles["DOCTOR"].id,
        is_active=True,
    )
    doctor2_user = User(
        id=uuid.uuid4(),
        email="doctor2@test.com",
        username="dr.other",
        password_hash=pwd,
        first_name="Doctor",
        last_name="Other",
        role_id=roles["DOCTOR"].id,
        is_active=True,
    )
    admin_user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        username="admin.test",
        password_hash=pwd,
        first_name="Admin",
        last_name="Hospital",
        role_id=roles["HOSPITAL_ADMIN"].id,
        is_active=True,
    )
    researcher_user = User(
        id=uuid.uuid4(),
        email="researcher@test.com",
        username="researcher.test",
        password_hash=pwd,
        first_name="Researcher",
        last_name="Test",
        role_id=roles["RESEARCHER"].id,
        is_active=True,
    )
    sysadmin_user = User(
        id=uuid.uuid4(),
        email="sysadmin@test.com",
        username="sysadmin.test",
        password_hash=pwd,
        first_name="System",
        last_name="Admin",
        role_id=roles["SYSTEM_ADMIN"].id,
        is_active=True,
    )

    for u in [doctor_user, doctor2_user, admin_user, researcher_user, sysadmin_user]:
        session.add(u)
    session.flush()

    # Seed demo patients
    patient1 = Patient(
        id=uuid.uuid4(),
        patient_identifier="PAT-TEST-001",
        first_name="Alice",
        last_name="Smith",
        date_of_birth=date(1970, 1, 1),
        gender="Female",
        phone="+1-555-0101",
        email="alice@test.com",
        address="100 Main St",
    )
    patient2 = Patient(
        id=uuid.uuid4(),
        patient_identifier="PAT-TEST-002",
        first_name="Bob",
        last_name="Jones",
        date_of_birth=date(1960, 5, 20),
        gender="Male",
        phone="+1-555-0102",
        email="bob@test.com",
        address="200 Broadway",
    )
    session.add(patient1)
    session.add(patient2)
    session.flush()

    # Assign patient1 to doctor_user only
    assign1 = DoctorPatientAssignment(
        id=uuid.uuid4(),
        doctor_id=doctor_user.id,
        patient_id=patient1.id,
    )
    session.add(assign1)
    session.commit()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Provide FastAPI test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def user_tokens(db_session: Session) -> dict[str, str]:
    """Pre-generate authorization headers for all 4 roles."""
    doctor = db_session.query(User).filter(User.username == "dr.test").first()
    doctor2 = db_session.query(User).filter(User.username == "dr.other").first()
    admin = db_session.query(User).filter(User.username == "admin.test").first()
    researcher = db_session.query(User).filter(User.username == "researcher.test").first()
    sysadmin = db_session.query(User).filter(User.username == "sysadmin.test").first()

    return {
        "DOCTOR": f"Bearer {create_access_token(str(doctor.id), 'DOCTOR')}",
        "DOCTOR2": f"Bearer {create_access_token(str(doctor2.id), 'DOCTOR')}",
        "HOSPITAL_ADMIN": f"Bearer {create_access_token(str(admin.id), 'HOSPITAL_ADMIN')}",
        "RESEARCHER": f"Bearer {create_access_token(str(researcher.id), 'RESEARCHER')}",
        "SYSTEM_ADMIN": f"Bearer {create_access_token(str(sysadmin.id), 'SYSTEM_ADMIN')}",
    }
