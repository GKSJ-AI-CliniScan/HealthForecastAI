"""Shared pytest fixtures for the backend test suite.

Tests run against a real database. By default that is an in-process SQLite file
so the suite needs no services; set TEST_DATABASE_URL to point at PostgreSQL and
the same tests run against the real engine, which is what CI does.
"""

from __future__ import annotations

import os
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rbac import Role
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.schemas.user import UserCreate
from app.services import auth_service

TEST_PASSWORD = "TestPassw0rd!"


@pytest.fixture(scope="session")
def engine():
    """Create the test database engine and schema."""
    url = os.environ.get("TEST_DATABASE_URL")

    if url:
        test_engine = create_engine(url, future=True)
    else:
        test_engine = create_engine(
            "sqlite://",
            future=True,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield test_engine
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture
def db(engine) -> Iterator[Session]:
    """Yield a session, and clear every table afterwards so tests stay isolated."""
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    session = factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        with engine.begin() as connection:
            for table in reversed(Base.metadata.sorted_tables):
                connection.execute(table.delete())


@pytest.fixture
def client(engine, db) -> Iterator[TestClient]:
    """Return a test client whose requests use the test database."""

    def override_get_db() -> Iterator[Session]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db) -> Callable[..., User]:
    """Return a factory that creates a user with a known password."""
    counter = {"n": 0}

    def _make(
        role: Role = Role.DOCTOR,
        email: str | None = None,
        password: str = TEST_PASSWORD,
        full_name: str = "Test User",
    ) -> User:
        counter["n"] += 1
        return auth_service.create_user(
            db,
            UserCreate(
                email=email or f"{role}.{counter['n']}@healthforecast.org",
                full_name=full_name,
                role=role,
                password=password,
            ),
        )

    return _make


@pytest.fixture
def auth_header(client) -> Callable[[User, str], dict[str, str]]:
    """Return a factory that logs a user in and returns their auth header.

    Goes through the real /auth/login endpoint rather than minting a token
    directly, so every test also exercises the login path.
    """

    def _make(user: User, password: str = TEST_PASSWORD) -> dict[str, str]:
        response = client.post(
            "/api/v1/auth/login", json={"email": user.email, "password": password}
        )
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _make


@pytest.fixture
def make_patient(db) -> Callable[..., Patient]:
    """Return a factory that creates a patient row directly."""
    counter = {"n": 0}

    def _make(
        assigned_doctor_id: int | None = None,
        age_group: str = "70-80",
        gender: str = "Female",
        primary_diagnosis: str = "Circulatory",
    ) -> Patient:
        counter["n"] += 1
        patient = Patient(
            medical_record_number=f"MRN-TEST-{counter['n']:05d}",
            age_group=age_group,
            gender=gender,
            race="Caucasian",
            primary_diagnosis=primary_diagnosis,
            assigned_doctor_id=assigned_doctor_id,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient

    return _make


@pytest.fixture
def make_admission(db) -> Callable[..., Admission]:
    """Return a factory that creates an admission row. Any column can be overridden."""
    counter = {"n": 0}

    def _make(patient_id: int, readmitted: str = "NO", **overrides: object) -> Admission:
        counter["n"] += 1
        values: dict[str, object] = {
            "patient_id": patient_id,
            "source_encounter_id": 1000 + counter["n"],
            "time_in_hospital": 4,
            "admission_type": "Emergency",
            "department": "InternalMedicine",
            "discharge_disposition": "Discharged to home",
            "num_medications": 12,
            "num_lab_procedures": 40,
            "number_diagnoses": 8,
            "number_inpatient": 0,
            "number_emergency": 0,
            "number_outpatient": 0,
            "readmitted": readmitted,
        }
        values.update(overrides)
        admission = Admission(**values)
        db.add(admission)
        db.commit()
        db.refresh(admission)
        return admission

    return _make


@pytest.fixture
def make_treatment(db) -> Callable[..., TreatmentOutcome]:
    """Return a factory that records one drug given during an admission."""

    def _make(
        admission_id: int, name: str = "insulin", dose_change: str = "Steady"
    ) -> TreatmentOutcome:
        row = TreatmentOutcome(
            admission_id=admission_id,
            treatment_name=name,
            dose_change=dose_change,
            medication_change=dose_change in ("Up", "Down"),
        )
        db.add(row)
        db.commit()
        return row

    return _make


@pytest.fixture
def make_cohort(db) -> Callable[..., list[int]]:
    """Bulk-create patients, admissions and treatments for statistical scenarios.

    Row by row through the ORM is fine for a handful of patients but slow for the
    hundreds a stratified comparison needs, so this inserts in one go.
    """
    counter = {"n": 0}

    def _make(
        count: int,
        readmitted: int,
        *,
        age_group: str = "70-80",
        diagnosis: str = "Circulatory",
        number_inpatient: int = 0,
        drug: str | None = None,
        dose_change: str = "Steady",
        doctor_id: int | None = None,
        **admission_overrides: object,
    ) -> list[int]:
        patient_rows = []
        for _ in range(count):
            counter["n"] += 1
            patient_rows.append(
                Patient(
                    medical_record_number=f"MRN-C-{counter['n']:06d}",
                    age_group=age_group,
                    gender="Female",
                    race="Caucasian",
                    primary_diagnosis=diagnosis,
                    assigned_doctor_id=doctor_id,
                )
            )
        db.add_all(patient_rows)
        db.flush()

        admissions = []
        for index, patient in enumerate(patient_rows):
            values: dict[str, object] = {
                "patient_id": patient.id,
                "source_encounter_id": 100000 + patient.id,
                "time_in_hospital": 4,
                "admission_type": "Emergency",
                "department": "InternalMedicine",
                "discharge_disposition": "Discharged to home",
                "number_inpatient": number_inpatient,
                "readmitted": "<30" if index < readmitted else "NO",
            }
            values.update(admission_overrides)
            admissions.append(Admission(**values))
        db.add_all(admissions)
        db.flush()

        if drug:
            db.add_all(
                TreatmentOutcome(
                    admission_id=a.id,
                    treatment_name=drug,
                    dose_change=dose_change,
                    medication_change=dose_change in ("Up", "Down"),
                )
                for a in admissions
            )
        db.commit()
        return [p.id for p in patient_rows]

    return _make
