"""Tests for risk prediction API endpoints."""

from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Patient, RiskPrediction


@pytest.fixture
def test_db() -> Generator[Session, None, None]:
    """Provide an isolated in-memory SQLite database."""

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)

    testing_session_local = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
    )

    db = testing_session_local()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def test_client(test_db: Session) -> Generator[TestClient, None, None]:
    """Provide a FastAPI client connected to the isolated test database."""

    def override_get_db() -> Generator[Session, None, None]:
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def patients(test_db: Session) -> list[Patient]:
    """Create test patients."""

    records = [
        Patient(
            id=1,
            medical_record_number="TEST-001",
            age_group="50-59",
        ),
        Patient(
            id=2,
            medical_record_number="TEST-002",
            age_group="60-69",
        ),
        Patient(
            id=3,
            medical_record_number="TEST-003",
            age_group="40-49",
        ),
    ]

    test_db.add_all(records)
    test_db.commit()

    return records


def add_prediction(
    test_db: Session,
    *,
    patient_id: int,
    probability: float,
    category: str,
) -> RiskPrediction:
    """Add a prediction to the test database."""

    prediction = RiskPrediction(
        patient_id=patient_id,
        readmission_probability=probability,
        risk_category=category,
        model_name="test_model",
        model_version="test",
    )

    test_db.add(prediction)
    test_db.commit()
    test_db.refresh(prediction)

    return prediction


def test_high_risk_returns_latest_high_prediction(
    test_client: TestClient,
    test_db: Session,
    patients: list[Patient],
    auth_header,
) -> None:
    """Return a patient when their latest prediction is high risk."""

    add_prediction(
        test_db,
        patient_id=patients[2].id,
        probability=0.85,
        category="high",
    )

    response = test_client.get(
        "/api/v1/risk/high-risk",
        headers=auth_header("doctor"),
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["patient_id"] == 3
    assert data[0]["readmission_probability"] == pytest.approx(0.85)
    assert data[0]["risk_category"] == "high"


def test_high_risk_excludes_low_risk_patients(
    test_client: TestClient,
    test_db: Session,
    patients: list[Patient],
    auth_header,
) -> None:
    """Do not return patients whose latest prediction is low risk."""

    add_prediction(
        test_db,
        patient_id=patients[0].id,
        probability=0.20,
        category="low",
    )

    add_prediction(
        test_db,
        patient_id=patients[1].id,
        probability=0.35,
        category="low",
    )

    response = test_client.get(
        "/api/v1/risk/high-risk",
        headers=auth_header("doctor"),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_high_risk_uses_latest_prediction(
    test_client: TestClient,
    test_db: Session,
    patients: list[Patient],
    auth_header,
) -> None:
    """Use the newest prediction when a patient has multiple predictions."""

    add_prediction(
        test_db,
        patient_id=patients[0].id,
        probability=0.85,
        category="high",
    )

    add_prediction(
        test_db,
        patient_id=patients[0].id,
        probability=0.20,
        category="low",
    )

    response = test_client.get(
        "/api/v1/risk/high-risk",
        headers=auth_header("doctor"),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_forecast_aggregates_latest_predictions(
    test_client: TestClient,
    test_db: Session,
    patients: list[Patient],
    auth_header,
) -> None:
    """Aggregate the latest prediction from each patient."""

    add_prediction(
        test_db,
        patient_id=patients[0].id,
        probability=0.80,
        category="high",
    )

    add_prediction(
        test_db,
        patient_id=patients[0].id,
        probability=0.20,
        category="low",
    )

    add_prediction(
        test_db,
        patient_id=patients[1].id,
        probability=0.30,
        category="low",
    )

    response = test_client.get(
        "/api/v1/risk/forecast?horizon_days=30",
        headers=auth_header("doctor"),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scope"] == "hospital"
    assert data["horizon_days"] == 30
    assert data["predicted_readmissions"] == pytest.approx(0.50)
    assert data["predicted_rate"] == pytest.approx(0.25)


def test_forecast_returns_zero_when_no_predictions(
    test_client: TestClient,
    auth_header,
) -> None:
    """Return zero forecast when no predictions exist."""

    response = test_client.get(
        "/api/v1/risk/forecast",
        headers=auth_header("doctor"),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["predicted_readmissions"] == 0.0
    assert data["predicted_rate"] == 0.0


def test_forecast_rejects_invalid_horizon(
    test_client: TestClient,
    auth_header,
) -> None:
    """Reject forecast horizons outside the supported range."""

    response = test_client.get(
        "/api/v1/risk/forecast?horizon_days=0",
        headers=auth_header("doctor"),
    )

    assert response.status_code == 422

def test_risk_drivers_returns_model_contributions(
    test_client: TestClient,
    patients: list[Patient],
    auth_header,
) -> None:
    """Return model-derived drivers for an existing patient."""

    expected_drivers = [
        {
            "feature": "number_inpatient",
            "value": None,
            "contribution": 0.31,
            "direction": "increases_risk",
        },
        {
            "feature": "time_in_hospital",
            "value": None,
            "contribution": -0.12,
            "direction": "decreases_risk",
        },
    ]

    with patch(
        "app.api.v1.endpoints.risk.get_risk_drivers",
        return_value=(0.171387466, expected_drivers),
    ):
        response = test_client.post(
            "/api/v1/risk/drivers",
            headers=auth_header("doctor"),
            json={
                "patient_id": patients[0].id,
                "time_in_hospital": 5,
                "num_medications": 12,
                "num_lab_procedures": 40,
                "number_diagnoses": 8,
                "number_inpatient": 2,
                "number_emergency": 1,
                "age_group": "50-59",
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert data["patient_id"] == patients[0].id
    assert data["probability"] == pytest.approx(0.171387466)
    assert data["model_name"] == "readmission_xgboost_v1"
    assert data["model_version"] == "1.0.0"
    assert data["drivers"] == expected_drivers


def test_risk_drivers_returns_404_for_unknown_patient(
    test_client: TestClient,
    auth_header,
) -> None:
    """Reject driver requests for unknown patients."""

    response = test_client.post(
        "/api/v1/risk/drivers",
        headers=auth_header("doctor"),
        json={
            "patient_id": 999999,
            "time_in_hospital": 5,
            "num_medications": 12,
            "num_lab_procedures": 40,
            "number_diagnoses": 8,
            "number_inpatient": 2,
            "number_emergency": 1,
            "age_group": "50-59",
        },
    )

    assert response.status_code == 404
