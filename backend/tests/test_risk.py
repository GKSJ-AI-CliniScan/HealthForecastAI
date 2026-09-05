"""Risk prediction and forecasting tests - Milestone 2.

The scoring endpoints need a trained artifact, which CI does not have, so those
tests skip when no model is loaded. Everything that does not need the model -
banding, scoping, forecasting arithmetic - always runs.
"""

import pytest

from app.core.rbac import Role
from app.models.prediction import RiskPrediction
from app.services import model_service, risk_service

pytestmark = pytest.mark.usefixtures("client")


@pytest.fixture
def scored(db, make_user, make_patient):
    """Create a doctor with a scored caseload spanning all three risk bands."""
    doctor = make_user(Role.DOCTOR)
    other = make_user(Role.DOCTOR)

    patients = {
        "high": make_patient(assigned_doctor_id=doctor.id),
        "medium": make_patient(assigned_doctor_id=doctor.id),
        "low": make_patient(assigned_doctor_id=doctor.id),
        "other_doctor": make_patient(assigned_doctor_id=other.id),
    }

    probabilities = {"high": 0.42, "medium": 0.15, "low": 0.03, "other_doctor": 0.55}
    for key, patient in patients.items():
        db.add(
            RiskPrediction(
                patient_id=patient.id,
                readmission_probability=probabilities[key],
                risk_category=risk_service.categorise_risk(probabilities[key]),
                model_name="test_model",
                model_version="1.0.0",
            )
        )
    db.commit()
    return {"doctor": doctor, "other": other, "patients": patients}


# --------------------------------------------------------------------------
# Banding
# --------------------------------------------------------------------------


def test_bands_reflect_the_calibrated_distribution() -> None:
    """The bands are 0.20 / 0.12, set from the measured calibrated probabilities."""
    assert risk_service.categorise_risk(0.25) == risk_service.RISK_HIGH
    assert risk_service.categorise_risk(0.20) == risk_service.RISK_HIGH
    assert risk_service.categorise_risk(0.15) == risk_service.RISK_MEDIUM
    assert risk_service.categorise_risk(0.12) == risk_service.RISK_MEDIUM
    assert risk_service.categorise_risk(0.05) == risk_service.RISK_LOW


def test_a_probability_outside_zero_to_one_raises() -> None:
    """An out-of-range probability is a bug in the model wrapper, not a band."""
    for value in (-0.01, 1.01):
        with pytest.raises(ValueError):
            risk_service.categorise_risk(value)


# --------------------------------------------------------------------------
# Scoping - the high risk cohort obeys the same rules as the patient list
# --------------------------------------------------------------------------


def test_doctor_sees_only_their_own_high_risk_patients(client, scored, auth_header) -> None:
    """Another doctor's high-risk patient must not appear in this cohort."""
    response = client.get("/api/v1/risk/high-risk", headers=auth_header(scored["doctor"]))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["patient_id"] == scored["patients"]["high"].id


def test_hospital_admin_sees_every_high_risk_patient(
    client, scored, make_user, auth_header
) -> None:
    """The administrator's cohort is hospital wide."""
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/risk/high-risk", headers=auth_header(admin))

    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_cohort_is_ordered_by_probability(client, scored, make_user, auth_header) -> None:
    """The riskiest patient is listed first - that is the review order."""
    admin = make_user(Role.HOSPITAL_ADMIN)
    items = client.get("/api/v1/risk/high-risk", headers=auth_header(admin)).json()["items"]

    probabilities = [item["readmission_probability"] for item in items]
    assert probabilities == sorted(probabilities, reverse=True)


def test_band_filter_selects_the_requested_band(client, scored, auth_header) -> None:
    """Switching band changes the cohort, still scoped to the caller."""
    header = auth_header(scored["doctor"])

    medium = client.get("/api/v1/risk/high-risk?category=medium", headers=header).json()
    low = client.get("/api/v1/risk/high-risk?category=low", headers=header).json()

    assert medium["total"] == 1
    assert medium["items"][0]["risk_category"] == "medium"
    assert low["total"] == 1


def test_researcher_cannot_read_the_risk_cohort(client, scored, make_user, auth_header) -> None:
    """The cohort is row-level patient data - researchers get aggregates only."""
    researcher = make_user(Role.RESEARCHER)
    assert client.get("/api/v1/risk/high-risk", headers=auth_header(researcher)).status_code == 403


def test_risk_endpoints_require_authentication(client) -> None:
    """No risk endpoint is reachable without a token."""
    for path in ("/api/v1/risk/high-risk", "/api/v1/risk/forecast", "/api/v1/risk/drivers"):
        assert client.get(path).status_code == 401


# --------------------------------------------------------------------------
# Distribution and forecasting
# --------------------------------------------------------------------------


def test_distribution_counts_each_band_within_scope(client, scored, auth_header) -> None:
    """A doctor's distribution covers their caseload only."""
    response = client.get("/api/v1/risk/distribution", headers=auth_header(scored["doctor"]))

    assert response.status_code == 200
    assert response.json() == {"low": 1, "medium": 1, "high": 1}


def test_forecast_sums_probabilities_rather_than_counting_flags(
    client, scored, make_user, auth_header
) -> None:
    """Expected readmissions is the sum of probabilities - the unbiased estimate."""
    admin = make_user(Role.HOSPITAL_ADMIN)
    body = client.get("/api/v1/risk/forecast", headers=auth_header(admin)).json()

    assert body["patients_scored"] == 4
    # 0.42 + 0.15 + 0.03 + 0.55
    assert body["expected_readmissions"] == pytest.approx(1.15, abs=0.05)
    assert body["expected_rate"] == pytest.approx(0.2875, abs=0.001)


def test_forecast_is_scoped_to_a_doctors_caseload(client, scored, auth_header) -> None:
    """A doctor forecasts their own caseload, not the hospital."""
    body = client.get("/api/v1/risk/forecast", headers=auth_header(scored["doctor"])).json()

    assert body["scope"] == "caseload"
    assert body["patients_scored"] == 3
    assert body["expected_readmissions"] == pytest.approx(0.60, abs=0.05)


def test_forecast_horizon_is_echoed_back(client, scored, make_user, auth_header) -> None:
    """The requested horizon appears in the response."""
    admin = make_user(Role.HOSPITAL_ADMIN)
    body = client.get("/api/v1/risk/forecast?horizon_days=90", headers=auth_header(admin)).json()
    assert body["horizon_days"] == 90


def test_only_the_latest_prediction_per_patient_counts(
    client, db, scored, make_user, auth_header
) -> None:
    """Re-scoring a patient must not double count them in the forecast."""
    admin = make_user(Role.HOSPITAL_ADMIN)
    before = client.get("/api/v1/risk/forecast", headers=auth_header(admin)).json()

    db.add(
        RiskPrediction(
            patient_id=scored["patients"]["low"].id,
            readmission_probability=0.90,
            risk_category="high",
            model_name="test_model",
            model_version="2.0.0",
        )
    )
    db.commit()

    after = client.get("/api/v1/risk/forecast", headers=auth_header(admin)).json()

    assert after["patients_scored"] == before["patients_scored"]
    # The new 0.90 replaces the old 0.03 rather than adding to it.
    assert after["expected_readmissions"] == pytest.approx(
        before["expected_readmissions"] + 0.87, abs=0.05
    )


def test_latest_prediction_is_returned_for_a_patient(client, scored, auth_header) -> None:
    """The patient risk endpoint returns the stored score."""
    patient = scored["patients"]["high"]
    response = client.get(
        f"/api/v1/risk/patients/{patient.id}", headers=auth_header(scored["doctor"])
    )

    assert response.status_code == 200
    assert response.json()["risk_category"] == "high"


def test_a_doctor_cannot_read_another_doctors_risk_score(client, scored, auth_header) -> None:
    """Risk scores obey the caseload scope, and 404 rather than 403."""
    other_patient = scored["patients"]["other_doctor"]
    response = client.get(
        f"/api/v1/risk/patients/{other_patient.id}", headers=auth_header(scored["doctor"])
    )
    assert response.status_code == 404


def test_an_unscored_patient_returns_404_with_a_useful_message(
    client, make_user, make_patient, auth_header
) -> None:
    """Not yet scored is a normal state and says how to fix it."""
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)

    response = client.get(f"/api/v1/risk/patients/{patient.id}", headers=auth_header(doctor))

    assert response.status_code == 404
    assert "score" in response.json()["detail"].lower()


# --------------------------------------------------------------------------
# Model-backed paths - skipped when no artifact is present
# --------------------------------------------------------------------------

needs_model = pytest.mark.skipif(
    not model_service.is_loaded(), reason="no trained model artifact available"
)


@needs_model
def test_predict_returns_a_calibrated_probability(
    client, make_user, make_patient, auth_header
) -> None:
    """A real-time prediction returns a probability, a band and the coverage."""
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)

    response = client.post(
        "/api/v1/risk/predict",
        headers=auth_header(doctor),
        json={
            "patient_id": patient.id,
            "time_in_hospital": 8,
            "num_medications": 20,
            "number_inpatient": 3,
            "number_emergency": 2,
            "number_diagnoses": 9,
            "age_group": "70-80",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert 0.0 <= body["readmission_probability"] <= 1.0
    assert body["risk_category"] in {"low", "medium", "high"}
    assert body["features_supplied"] > 0
    assert body["features_expected"] >= body["features_supplied"]


@needs_model
def test_predict_refuses_a_patient_outside_the_caseload(
    client, make_user, make_patient, auth_header
) -> None:
    """Scoring is scoped like every other patient operation."""
    doctor = make_user(Role.DOCTOR)
    other = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=other.id)

    response = client.post(
        "/api/v1/risk/predict",
        headers=auth_header(doctor),
        json={"patient_id": patient.id, "time_in_hospital": 4},
    )
    assert response.status_code == 404


@needs_model
def test_drivers_explain_the_model(client, make_user, auth_header) -> None:
    """A risk score with no explanation is not actionable."""
    doctor = make_user(Role.DOCTOR)
    response = client.get("/api/v1/risk/drivers?limit=5", headers=auth_header(doctor))

    assert response.status_code == 200
    drivers = response.json()
    assert len(drivers) <= 5
    for driver in drivers:
        assert driver["feature"]
        assert "direction" in driver
