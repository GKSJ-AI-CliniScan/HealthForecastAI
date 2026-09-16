"""Tests for risk prediction API endpoints."""

from datetime import UTC, datetime, timedelta

from app.core.rbac import Role
from app.models.prediction import RiskPrediction


def test_high_risk_returns_visible_predictions(client, db_session, users, patients, auth_header):
    """Doctor should see high-risk predictions for assigned patients."""

    db_session.add(
        RiskPrediction(
            patient_id=patients[0].id,
            readmission_probability=0.85,
            risk_category="high",
            model_name="test-model",
            model_version="1.0.0",
        )
    )
    db_session.commit()

    response = client.get(
        "/api/v1/risk/high-risk",
        headers=auth_header(Role.DOCTOR),
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["patient_id"] == patients[0].id
    assert data[0]["risk_category"] == "high"
    assert data[0]["readmission_probability"] == 0.85


def test_high_risk_is_scoped_for_doctor(client, db_session, users, patients, auth_header):
    """Doctor should not see high-risk predictions for unassigned patients."""

    db_session.add_all(
        [
            RiskPrediction(
                patient_id=patients[0].id,
                readmission_probability=0.85,
                risk_category="high",
                model_name="test-model",
                model_version="1.0.0",
            ),
            RiskPrediction(
                patient_id=patients[1].id,
                readmission_probability=0.90,
                risk_category="high",
                model_name="test-model",
                model_version="1.0.0",
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        "/api/v1/risk/high-risk",
        headers=auth_header(Role.DOCTOR),
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["patient_id"] == patients[0].id


def test_forecast_returns_count_and_rate(client, db_session, users, patients, auth_header):
    """Forecast should aggregate recent stored predictions."""

    now = datetime.now(UTC)

    db_session.add_all(
        [
            RiskPrediction(
                patient_id=patients[0].id,
                readmission_probability=0.85,
                risk_category="high",
                model_name="test-model",
                model_version="1.0.0",
                created_at=now,
            ),
            RiskPrediction(
                patient_id=patients[1].id,
                readmission_probability=0.20,
                risk_category="low",
                model_name="test-model",
                model_version="1.0.0",
                created_at=now,
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        "/api/v1/risk/forecast?horizon_days=30",
        headers=auth_header(Role.SYSTEM_ADMIN),
    )

    assert response.status_code == 200
    data = response.json()

    assert data["scope"] == "hospital"
    assert data["horizon_days"] == 30
    assert data["predicted_readmissions"] == 1
    assert data["predicted_rate"] == 0.5


def test_forecast_ignores_predictions_outside_horizon(
    client, db_session, users, patients, auth_header
):
    """Forecast should ignore predictions older than the requested horizon."""

    now = datetime.now(UTC)

    db_session.add_all(
        [
            RiskPrediction(
                patient_id=patients[0].id,
                readmission_probability=0.85,
                risk_category="high",
                model_name="test-model",
                model_version="1.0.0",
                created_at=now,
            ),
            RiskPrediction(
                patient_id=patients[1].id,
                readmission_probability=0.90,
                risk_category="high",
                model_name="test-model",
                model_version="1.0.0",
                created_at=now - timedelta(days=60),
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        "/api/v1/risk/forecast?horizon_days=30",
        headers=auth_header(Role.DOCTOR),
    )

    assert response.status_code == 200
    data = response.json()

    assert data["predicted_readmissions"] == 1
    assert data["predicted_rate"] == 1.0
