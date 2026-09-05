"""Tests for the risk prediction endpoints.

These cover the two things that are easy to get wrong and expensive when wrong:
a caller reaching a patient outside their scope, and a missing model artefact
being reported as a successful zero rather than an outage.
"""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.services import model_service, risk_service


class _StubPipeline:
    """A stand-in for the trained pipeline that returns a fixed probability."""

    def __init__(self, probability: float) -> None:
        self.probability = probability

    def predict_proba(self, frame: Any) -> list[list[float]]:
        """Return the configured probability for every row."""
        return [[1.0 - self.probability, self.probability] for _ in range(len(frame))]


@pytest.fixture(name="stub_model")
def stub_model_fixture(monkeypatch: pytest.MonkeyPatch) -> Iterator[dict[str, float]]:
    """Replace the artefact loader with a stub so tests need no trained model."""
    state = {"probability": 0.85}

    def fake_predict(features: dict[str, Any]) -> float:
        return state["probability"]

    monkeypatch.setattr(model_service, "predict_probability", fake_predict)
    monkeypatch.setattr(model_service, "model_version", lambda: "test-model-1")
    yield state
    model_service.reset_cache()


def _payload(patient_id: int) -> dict[str, Any]:
    """Build a valid prediction request body."""
    return {
        "patient_id": patient_id,
        "time_in_hospital": 6,
        "num_medications": 12,
        "num_lab_procedures": 41,
        "number_diagnoses": 7,
        "number_inpatient": 1,
        "number_emergency": 0,
        "age_group": "[70-80)",
    }


# --- banding ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("probability", "expected"),
    [
        (0.0, "low"),
        (0.39, "low"),
        (0.40, "medium"),
        (0.69, "medium"),
        (0.70, "high"),
        (1.0, "high"),
    ],
)
def test_risk_bands_are_inclusive_at_the_boundary(probability: float, expected: str) -> None:
    """A probability exactly on a threshold belongs to the higher band."""
    assert risk_service.categorise_risk(probability) == expected


@pytest.mark.parametrize("probability", [-0.01, 1.01])
def test_risk_band_rejects_impossible_probability(probability: float) -> None:
    """A value outside [0, 1] is a bug upstream, not something to band silently."""
    with pytest.raises(ValueError):
        risk_service.categorise_risk(probability)


# --- authorisation ---------------------------------------------------------


def test_researcher_cannot_score_an_individual_patient(
    client: TestClient, auth_header: Any, patients: list[Patient], stub_model: dict[str, float]
) -> None:
    """Researchers hold aggregated rights only; individual scoring is denied."""
    response = client.post(
        "/api/v1/risk/predict",
        json=_payload(patients[0].id),
        headers=auth_header(Role.RESEARCHER),
    )
    assert response.status_code == 403


def test_unauthenticated_request_is_rejected(client: TestClient, patients: list[Patient]) -> None:
    """No token means no prediction."""
    response = client.post("/api/v1/risk/predict", json=_payload(patients[0].id))
    assert response.status_code == 401


def test_doctor_can_score_their_own_patient(
    client: TestClient, auth_header: Any, patients: list[Patient], stub_model: dict[str, float]
) -> None:
    """The assigned doctor gets a probability and a band back."""
    response = client.post(
        "/api/v1/risk/predict",
        json=_payload(patients[0].id),
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["risk_category"] == "high"
    assert body["readmission_probability"] == pytest.approx(0.85)
    assert body["model_version"] == "test-model-1"


def test_doctor_cannot_score_another_doctors_patient(
    client: TestClient, auth_header: Any, patients: list[Patient], stub_model: dict[str, float]
) -> None:
    """An unassigned patient is out of scope and must read as not found.

    404 rather than 403 on purpose: 403 would confirm the record exists.
    """
    response = client.post(
        "/api/v1/risk/predict",
        json=_payload(patients[1].id),
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 404


# --- model availability ----------------------------------------------------


def test_missing_model_returns_503_not_a_zero_score(
    client: TestClient,
    auth_header: Any,
    patients: list[Patient],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An untrained model is an outage, not a patient with no risk."""

    def unavailable(features: dict[str, Any]) -> float:
        raise model_service.ModelUnavailableError("No trained model on disk")

    monkeypatch.setattr(model_service, "predict_probability", unavailable)

    response = client.post(
        "/api/v1/risk/predict",
        json=_payload(patients[0].id),
        headers=auth_header(Role.DOCTOR),
    )
    assert response.status_code == 503
    assert "No trained model" in response.json()["detail"]


# --- persistence and scoping ----------------------------------------------


def test_prediction_is_persisted(
    client: TestClient,
    auth_header: Any,
    patients: list[Patient],
    db_session: Session,
    stub_model: dict[str, float],
) -> None:
    """The stored row is what later reads and forecasts are built from."""
    client.post(
        "/api/v1/risk/predict",
        json=_payload(patients[0].id),
        headers=auth_header(Role.DOCTOR),
    )
    stored = db_session.query(RiskPrediction).all()
    assert len(stored) == 1
    assert stored[0].patient_id == patients[0].id
    assert stored[0].risk_category == "high"


def test_high_risk_list_excludes_low_risk_rows(
    client: TestClient,
    auth_header: Any,
    patients: list[Patient],
    stub_model: dict[str, float],
) -> None:
    """Only rows in the high band appear in the high-risk cohort."""
    stub_model["probability"] = 0.10
    client.post(
        "/api/v1/risk/predict",
        json=_payload(patients[0].id),
        headers=auth_header(Role.DOCTOR),
    )
    response = client.get("/api/v1/risk/high-risk", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200
    assert response.json() == []


def test_doctor_high_risk_list_is_row_scoped(
    client: TestClient,
    auth_header: Any,
    patients: list[Patient],
    db_session: Session,
) -> None:
    """A doctor must not see risk scores for a patient assigned elsewhere."""
    db_session.add(
        RiskPrediction(
            patient_id=patients[1].id,
            readmission_probability=0.91,
            risk_category="high",
            model_name="test",
            model_version="test-1",
        )
    )
    db_session.commit()

    doctor_view = client.get("/api/v1/risk/high-risk", headers=auth_header(Role.DOCTOR))
    assert doctor_view.json() == []

    admin_view = client.get("/api/v1/risk/high-risk", headers=auth_header(Role.SYSTEM_ADMIN))
    assert len(admin_view.json()) == 1


# --- forecast --------------------------------------------------------------


def test_forecast_is_empty_before_any_scoring(
    client: TestClient, auth_header: Any, patients: list[Patient]
) -> None:
    """With nothing scored, the forecast reports zero rather than guessing."""
    response = client.get("/api/v1/risk/forecast", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200
    body = response.json()
    assert body["patients_scored"] == 0
    assert body["predicted_readmissions"] == 0


def test_forecast_sums_probabilities_rather_than_counting_high_risk(
    client: TestClient, auth_header: Any, patients: list[Patient], db_session: Session
) -> None:
    """Four patients at 0.5 forecast two readmissions, not zero.

    Counting only patients above the high threshold would report zero here,
    which is the mistake this test exists to prevent.
    """
    for _ in range(4):
        db_session.add(
            RiskPrediction(
                patient_id=patients[0].id,
                readmission_probability=0.5,
                risk_category="medium",
                model_name="test",
                model_version="test-1",
            )
        )
    db_session.commit()

    response = client.get("/api/v1/risk/forecast", headers=auth_header(Role.DOCTOR))
    body = response.json()
    assert body["predicted_readmissions"] == 2
    assert body["predicted_rate"] == pytest.approx(0.5)
    assert body["scope"] == "assigned"


def test_doctor_forecast_is_row_scoped(
    client: TestClient, auth_header: Any, patients: list[Patient], db_session: Session
) -> None:
    """N7: a doctor's forecast must not include another ward's predictions.

    Same discipline as /risk/high-risk's row scoping (test_doctor_high_risk_list_is_row_scoped) -
    forecast() applies scope_patient_ids the same way latest_predictions() does.
    """
    db_session.add(
        RiskPrediction(
            patient_id=patients[0].id,  # assigned to the test doctor
            readmission_probability=0.5,
            risk_category="medium",
            model_name="test",
            model_version="test-1",
        )
    )
    db_session.add(
        RiskPrediction(
            patient_id=patients[1].id,  # unassigned - outside the doctor's scope
            readmission_probability=0.9,
            risk_category="high",
            model_name="test",
            model_version="test-1",
        )
    )
    db_session.commit()

    doctor_view = client.get("/api/v1/risk/forecast", headers=auth_header(Role.DOCTOR)).json()
    assert doctor_view["patients_scored"] == 1
    assert doctor_view["predicted_rate"] == pytest.approx(0.5)
    assert doctor_view["scope"] == "assigned"

    admin_view = client.get(
        "/api/v1/risk/forecast", headers=auth_header(Role.HOSPITAL_ADMIN)
    ).json()
    assert admin_view["patients_scored"] == 2
    assert admin_view["scope"] == "hospital"


def test_researcher_cannot_read_the_forecast(
    client: TestClient, auth_header: Any, patients: list[Patient]
) -> None:
    """The forecast needs READMISSION_FORECAST_READ, which researchers lack."""
    response = client.get("/api/v1/risk/forecast", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 403
