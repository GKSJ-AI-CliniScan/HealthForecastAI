"""Risk endpoint tests - Milestone 2 backend cleanup.

Regression cover for three defects fixed together:

1. /risk/high-risk ignored doctor_patient_map, hiding co-managed patients from
   the clinician responsible for them.
2. score_and_save wrote a prediction without checking that the patient existed
   or lay inside the caller's scope.
3. /risk/high-risk refused the hospital administrator, contradicting the access
   matrix row the platform documents for risk reporting.

Predictions are seeded directly rather than scored through the model, so these
tests do not depend on a trained artifact being present. The scoring tests that
do exercise the model patch it, for the same reason.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import create_access_token
from app.models.prediction import RiskPrediction
from app.models.user import User
from app.repositories.doctor_patient_repository import DoctorPatientRepository

HIGH_RISK_URL = "/api/v1/risk/high-risk"
PREDICT_URL = "/api/v1/risk/predict"

# A probability comfortably above RISK_THRESHOLD_HIGH so the banding is stable
# whatever the configured thresholds are.
HIGH_PROBABILITY = 0.95


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def make_doctor(db: Session, email: str) -> User:
    doctor = User(
        email=email,
        full_name="Doctor Under Test",
        hashed_password="not-a-real-hash",
        role=str(Role.DOCTOR),
        is_active=True,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def doctor_header(doctor: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(doctor.id), role='doctor')}"}


def create_patient(client: TestClient, auth_header, mrn: str, **extra) -> dict:
    response = client.post(
        "/api/v1/patients",
        json={"medical_record_number": mrn, **extra},
        headers=admin(auth_header),
    )
    assert response.status_code == 201, response.text
    return response.json()


def seed_score(
    db: Session, patient_id: int, probability: float, category: str, minutes_ago: int = 0
) -> RiskPrediction:
    """Insert a stored prediction without invoking the model."""
    prediction = RiskPrediction(
        patient_id=patient_id,
        readmission_probability=probability,
        risk_category=category,
        model_name="test-model",
        model_version="0.0.0",
        created_at=datetime.now(UTC) - timedelta(minutes=minutes_ago),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def predict_payload(patient_id: int) -> dict:
    return {
        "patient_id": patient_id,
        "time_in_hospital": 5,
        "num_medications": 10,
        "num_lab_procedures": 30,
        "number_diagnoses": 5,
    }


# ---------------------------------------------------------------------------
# Fix 1 - doctor scope honours doctor_patient_map
# ---------------------------------------------------------------------------


def test_doctor_sees_their_primary_assignment(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A doctor's own assigned patient appears in the high risk cohort."""
    doctor = make_doctor(db_session, "hr.primary@hospital.org")
    mine = create_patient(client, auth_header, "MRN-HR-100", assigned_doctor_id=doctor.id)
    seed_score(db_session, mine["id"], HIGH_PROBABILITY, "high")

    response = client.get(HIGH_RISK_URL, headers=doctor_header(doctor))
    assert response.status_code == 200
    assert [row["patient_id"] for row in response.json()] == [mine["id"]]


def test_doctor_sees_a_patient_granted_through_the_map(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The regression: a co-managed patient must not be hidden.

    Before the fix this endpoint filtered on patients.assigned_doctor_id alone,
    so a high risk patient granted through doctor_patient_map was invisible to
    the doctor responsible for them.
    """
    doctor = make_doctor(db_session, "hr.mapped@hospital.org")
    shared = create_patient(client, auth_header, "MRN-HR-110")
    DoctorPatientRepository(db_session).assign(doctor_id=doctor.id, patient_id=shared["id"])
    seed_score(db_session, shared["id"], HIGH_PROBABILITY, "high")

    response = client.get(HIGH_RISK_URL, headers=doctor_header(doctor))
    assert response.status_code == 200
    assert [row["patient_id"] for row in response.json()] == [shared["id"]]


def test_doctor_sees_primary_and_mapped_together_without_duplicates(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Both routes to scope are unioned, and an overlap is returned once."""
    doctor = make_doctor(db_session, "hr.union@hospital.org")
    primary = create_patient(client, auth_header, "MRN-HR-120", assigned_doctor_id=doctor.id)
    mapped = create_patient(client, auth_header, "MRN-HR-121")
    both = create_patient(client, auth_header, "MRN-HR-122", assigned_doctor_id=doctor.id)

    repository = DoctorPatientRepository(db_session)
    repository.assign(doctor_id=doctor.id, patient_id=mapped["id"])
    repository.assign(doctor_id=doctor.id, patient_id=both["id"])

    for index, created in enumerate((primary, mapped, both)):
        seed_score(db_session, created["id"], HIGH_PROBABILITY, "high", minutes_ago=index)

    returned = [
        row["patient_id"] for row in client.get(HIGH_RISK_URL, headers=doctor_header(doctor)).json()
    ]
    assert sorted(returned) == sorted([primary["id"], mapped["id"], both["id"]])
    assert len(returned) == len(set(returned)), "a patient in scope twice must appear once"


def test_doctor_never_sees_another_doctors_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Widening scope must not widen it past the caller's own caseload."""
    doctor = make_doctor(db_session, "hr.scoped@hospital.org")
    mine = create_patient(client, auth_header, "MRN-HR-130", assigned_doctor_id=doctor.id)
    theirs = create_patient(client, auth_header, "MRN-HR-131")
    seed_score(db_session, mine["id"], HIGH_PROBABILITY, "high")
    seed_score(db_session, theirs["id"], HIGH_PROBABILITY, "high")

    returned = [
        row["patient_id"] for row in client.get(HIGH_RISK_URL, headers=doctor_header(doctor)).json()
    ]
    assert returned == [mine["id"]]
    assert theirs["id"] not in returned


def test_only_the_latest_prediction_counts(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A patient re-scored into a lower band leaves the high risk cohort."""
    doctor = make_doctor(db_session, "hr.latest@hospital.org")
    created = create_patient(client, auth_header, "MRN-HR-140", assigned_doctor_id=doctor.id)
    seed_score(db_session, created["id"], HIGH_PROBABILITY, "high", minutes_ago=60)
    seed_score(db_session, created["id"], 0.01, "low", minutes_ago=0)

    assert client.get(HIGH_RISK_URL, headers=doctor_header(doctor)).json() == []


# ---------------------------------------------------------------------------
# Fix 3 - hospital administrator access, hospital scoped
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.DOCTOR, 200),
        (Role.HOSPITAL_ADMIN, 200),
        (Role.SYSTEM_ADMIN, 200),
        (Role.RESEARCHER, 403),
    ],
)
def test_high_risk_access_matches_the_access_matrix(
    client: TestClient, auth_header, role: Role, expected: int
) -> None:
    """Hospital admin is admitted; the researcher restriction is preserved."""
    assert client.get(HIGH_RISK_URL, headers=auth_header(role)).status_code == expected


def test_high_risk_rejects_an_anonymous_caller(client: TestClient) -> None:
    """The cohort is never readable without a token."""
    assert client.get(HIGH_RISK_URL).status_code == 401


def test_hospital_admin_reads_hospital_wide(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A hospital administrator sees every high risk patient, not a subset."""
    doctor = make_doctor(db_session, "hr.hospital@hospital.org")
    assigned = create_patient(client, auth_header, "MRN-HR-200", assigned_doctor_id=doctor.id)
    unassigned = create_patient(client, auth_header, "MRN-HR-201")
    seed_score(db_session, assigned["id"], HIGH_PROBABILITY, "high", minutes_ago=1)
    seed_score(db_session, unassigned["id"], HIGH_PROBABILITY, "high", minutes_ago=0)

    returned = {
        row["patient_id"]
        for row in client.get(HIGH_RISK_URL, headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    }
    assert returned == {assigned["id"], unassigned["id"]}


def test_hospital_admin_and_system_admin_agree(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Both hospital wide roles see the same cohort."""
    created = create_patient(client, auth_header, "MRN-HR-210")
    seed_score(db_session, created["id"], HIGH_PROBABILITY, "high")

    from_hospital_admin = client.get(HIGH_RISK_URL, headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    from_system_admin = client.get(HIGH_RISK_URL, headers=admin(auth_header)).json()
    assert [r["patient_id"] for r in from_hospital_admin] == [
        r["patient_id"] for r in from_system_admin
    ]


def test_only_the_high_band_is_returned(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Medium and low patients stay out of the high risk cohort."""
    for index, (mrn, probability, band) in enumerate(
        [
            ("MRN-HR-220", HIGH_PROBABILITY, "high"),
            ("MRN-HR-221", 0.15, "medium"),
            ("MRN-HR-222", 0.01, "low"),
        ]
    ):
        created = create_patient(client, auth_header, mrn)
        seed_score(db_session, created["id"], probability, band, minutes_ago=index)

    bands = {
        row["risk_category"] for row in client.get(HIGH_RISK_URL, headers=admin(auth_header)).json()
    }
    assert bands == {"high"}


# ---------------------------------------------------------------------------
# Fix 2 - scoring authorisation
# ---------------------------------------------------------------------------


def test_admin_can_score_any_existing_patient(client: TestClient, auth_header) -> None:
    """Valid case: a hospital wide role scores a real patient successfully."""
    created = create_patient(client, auth_header, "MRN-HR-300")

    with patch("app.services.risk_service.predict_readmission", return_value=0.42):
        response = client.post(
            PREDICT_URL, json=predict_payload(created["id"]), headers=admin(auth_header)
        )

    assert response.status_code == 200, response.text
    assert response.json()["patient_id"] == created["id"]
    assert response.json()["readmission_probability"] == pytest.approx(0.42)


def test_doctor_can_score_their_own_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A doctor scoring a patient in their caseload still works."""
    doctor = make_doctor(db_session, "score.mine@hospital.org")
    mine = create_patient(client, auth_header, "MRN-HR-310", assigned_doctor_id=doctor.id)

    with patch("app.services.risk_service.predict_readmission", return_value=0.30):
        response = client.post(
            PREDICT_URL, json=predict_payload(mine["id"]), headers=doctor_header(doctor)
        )
    assert response.status_code == 200, response.text


def test_doctor_can_score_a_patient_granted_through_the_map(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Scoring scope matches reading scope, mapping included."""
    doctor = make_doctor(db_session, "score.mapped@hospital.org")
    shared = create_patient(client, auth_header, "MRN-HR-320")
    DoctorPatientRepository(db_session).assign(doctor_id=doctor.id, patient_id=shared["id"])

    with patch("app.services.risk_service.predict_readmission", return_value=0.30):
        response = client.post(
            PREDICT_URL, json=predict_payload(shared["id"]), headers=doctor_header(doctor)
        )
    assert response.status_code == 200, response.text


def test_doctor_cannot_score_an_out_of_scope_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The regression: scoring another doctor's patient must be refused."""
    doctor = make_doctor(db_session, "score.outside@hospital.org")
    theirs = create_patient(client, auth_header, "MRN-HR-330")

    with patch("app.services.risk_service.predict_readmission", return_value=0.30):
        response = client.post(
            PREDICT_URL, json=predict_payload(theirs["id"]), headers=doctor_header(doctor)
        )

    assert response.status_code == 404


def test_no_prediction_is_written_for_an_out_of_scope_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A refused request must leave risk_predictions untouched."""
    doctor = make_doctor(db_session, "score.norow@hospital.org")
    theirs = create_patient(client, auth_header, "MRN-HR-340")

    with patch("app.services.risk_service.predict_readmission", return_value=0.30):
        client.post(PREDICT_URL, json=predict_payload(theirs["id"]), headers=doctor_header(doctor))

    stored = db_session.query(RiskPrediction).filter_by(patient_id=theirs["id"]).all()
    assert stored == []


def test_the_model_is_not_invoked_for_an_out_of_scope_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Authorisation runs before inference, so a refusal costs no model call."""
    doctor = make_doctor(db_session, "score.nocall@hospital.org")
    theirs = create_patient(client, auth_header, "MRN-HR-350")

    with patch("app.services.risk_service.predict_readmission") as predict:
        client.post(PREDICT_URL, json=predict_payload(theirs["id"]), headers=doctor_header(doctor))

    predict.assert_not_called()


def test_scoring_a_missing_patient_returns_404(client: TestClient, auth_header) -> None:
    """A patient id that does not exist is refused, not written."""
    with patch("app.services.risk_service.predict_readmission", return_value=0.30):
        response = client.post(
            PREDICT_URL, json=predict_payload(999999), headers=admin(auth_header)
        )
    assert response.status_code == 404


def test_no_prediction_is_written_for_a_missing_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The foreign key is never reached because the service refuses first."""
    with patch("app.services.risk_service.predict_readmission", return_value=0.30):
        client.post(PREDICT_URL, json=predict_payload(999999), headers=admin(auth_header))

    assert db_session.query(RiskPrediction).filter_by(patient_id=999999).all() == []


def test_refused_scoring_is_audited(client: TestClient, auth_header, db_session: Session) -> None:
    """The refusal is recorded, because PatientService audits the failed read."""
    from app.repositories.audit_repository import AuditRepository

    doctor = make_doctor(db_session, "score.audited@hospital.org")
    theirs = create_patient(client, auth_header, "MRN-HR-360")

    with patch("app.services.risk_service.predict_readmission", return_value=0.30):
        client.post(PREDICT_URL, json=predict_payload(theirs["id"]), headers=doctor_header(doctor))

    failures = [
        entry
        for entry in AuditRepository(db_session).list_recent()
        if entry.action == "patient.read" and entry.outcome == "failure"
    ]
    assert len(failures) == 1
    assert failures[0].actor_id == doctor.id


# ---------------------------------------------------------------------------
# Fix 4 - /risk/forecast role scoping
# ---------------------------------------------------------------------------

FORECAST_URL = "/api/v1/risk/forecast"


def test_doctor_forecast_excludes_hospital_wide_data(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The regression: a doctor must not receive hospital wide forecast numbers.

    Two patients exist with very different scores. Only one is the doctor's, so
    the doctor's base rate must equal that patient's probability alone. Before
    the fix the forecast aggregated every scored patient in the database.
    """
    doctor = make_doctor(db_session, "fc.scope@hospital.org")
    mine = create_patient(client, auth_header, "MRN-FC-100", assigned_doctor_id=doctor.id)
    theirs = create_patient(client, auth_header, "MRN-FC-101")
    seed_score(db_session, mine["id"], 0.10, "low", minutes_ago=1)
    seed_score(db_session, theirs["id"], 0.90, "high", minutes_ago=0)

    body = client.get(FORECAST_URL, headers=doctor_header(doctor)).json()

    assert body["predicted_rate"] == pytest.approx(0.10), "doctor saw another patient's score"
    assert body["scope"] == "assigned_patients"


def test_doctor_forecast_includes_a_mapped_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Forecast scope matches read scope, doctor_patient_map included."""
    doctor = make_doctor(db_session, "fc.mapped@hospital.org")
    shared = create_patient(client, auth_header, "MRN-FC-110")
    DoctorPatientRepository(db_session).assign(doctor_id=doctor.id, patient_id=shared["id"])
    seed_score(db_session, shared["id"], 0.40, "high")

    body = client.get(FORECAST_URL, headers=doctor_header(doctor)).json()
    assert body["predicted_rate"] == pytest.approx(0.40)
    # round(0.40 * 1 patient) is 0 - the mapped patient is in scope, which the
    # rate proves; the count is simply below the rounding boundary.
    assert body["predicted_readmissions"] == 0
    assert body["scope"] == "assigned_patients"


def test_doctor_with_no_patients_forecasts_zero(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A doctor with an empty caseload gets zeros, not the hospital's numbers."""
    doctor = make_doctor(db_session, "fc.empty@hospital.org")
    other = create_patient(client, auth_header, "MRN-FC-120")
    seed_score(db_session, other["id"], 0.90, "high")

    body = client.get(FORECAST_URL, headers=doctor_header(doctor)).json()
    assert body["predicted_rate"] == 0.0
    assert body["predicted_readmissions"] == 0
    assert body["scope"] == "assigned_patients"


def test_hospital_admin_forecast_is_hospital_wide(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A hospital administrator aggregates over every scored patient."""
    doctor = make_doctor(db_session, "fc.hospital@hospital.org")
    assigned = create_patient(client, auth_header, "MRN-FC-200", assigned_doctor_id=doctor.id)
    unassigned = create_patient(client, auth_header, "MRN-FC-201")
    seed_score(db_session, assigned["id"], 0.10, "low", minutes_ago=1)
    seed_score(db_session, unassigned["id"], 0.30, "high", minutes_ago=0)

    body = client.get(FORECAST_URL, headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    assert body["predicted_rate"] == pytest.approx(0.20), "mean of both patients"
    assert body["scope"] == "hospital"


def test_hospital_admin_and_system_admin_forecasts_agree(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Both hospital wide roles compute the same projection."""
    created = create_patient(client, auth_header, "MRN-FC-210")
    seed_score(db_session, created["id"], 0.25, "high")

    from_hospital = client.get(FORECAST_URL, headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    from_system = client.get(FORECAST_URL, headers=admin(auth_header)).json()
    assert from_hospital["predicted_rate"] == from_system["predicted_rate"]
    assert from_hospital["scope"] == from_system["scope"] == "hospital"


def test_researcher_is_refused_the_forecast(client: TestClient, auth_header) -> None:
    """The researcher holds no readmission_forecast:read permission."""
    assert client.get(FORECAST_URL, headers=auth_header(Role.RESEARCHER)).status_code == 403


def test_forecast_rejects_an_anonymous_caller(client: TestClient) -> None:
    """No forecast without a token."""
    assert client.get(FORECAST_URL).status_code == 401


def test_forecast_scope_label_reflects_the_actual_data(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The scope field must not claim a breadth the numbers do not have."""
    doctor = make_doctor(db_session, "fc.label@hospital.org")
    assert (
        client.get(FORECAST_URL, headers=doctor_header(doctor)).json()["scope"]
        == "assigned_patients"
    )
    assert client.get(FORECAST_URL, headers=admin(auth_header)).json()["scope"] == "hospital"


def test_forecast_horizon_scales_within_doctor_scope(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Linear scaling still holds once the data is narrowed."""
    doctor = make_doctor(db_session, "fc.scale@hospital.org")
    mine = create_patient(client, auth_header, "MRN-FC-300", assigned_doctor_id=doctor.id)
    seed_score(db_session, mine["id"], 0.20, "high")

    header = doctor_header(doctor)
    assert client.get(f"{FORECAST_URL}?horizon_days=30", headers=header).json()[
        "predicted_rate"
    ] == pytest.approx(0.20)
    assert client.get(f"{FORECAST_URL}?horizon_days=60", headers=header).json()[
        "predicted_rate"
    ] == pytest.approx(0.40)


# ---------------------------------------------------------------------------
# Fix 5 - /risk/forecast horizon validation
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("horizon", [0, -1, -30, 366, 100000])
def test_forecast_rejects_an_out_of_range_horizon(
    client: TestClient, auth_header, horizon: int
) -> None:
    """Out of range horizons return 422, never a 500."""
    response = client.get(f"{FORECAST_URL}?horizon_days={horizon}", headers=admin(auth_header))
    assert response.status_code == 422, response.text


def test_forecast_rejects_a_non_numeric_horizon(client: TestClient, auth_header) -> None:
    """FastAPI coercion refuses a non-integer horizon."""
    response = client.get(f"{FORECAST_URL}?horizon_days=abc", headers=admin(auth_header))
    assert response.status_code == 422


@pytest.mark.parametrize("horizon", [1, 30, 365])
def test_forecast_accepts_the_supported_range(
    client: TestClient, auth_header, horizon: int
) -> None:
    """The documented bounds are inclusive at both ends."""
    response = client.get(f"{FORECAST_URL}?horizon_days={horizon}", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json()["horizon_days"] == horizon


def test_negative_horizon_no_longer_produces_a_negative_rate(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The original defect: a negative horizon produced a negative rate.

    That failed the response model ge=0.0 constraint and surfaced as a 500.
    Validation now refuses it before any arithmetic happens.
    """
    created = create_patient(client, auth_header, "MRN-FC-400")
    seed_score(db_session, created["id"], 0.50, "high")

    response = client.get(f"{FORECAST_URL}?horizon_days=-30", headers=admin(auth_header))
    assert response.status_code == 422
    assert "must be between 1 and 365" in response.json()["detail"]


def test_both_forecast_surfaces_share_the_same_bounds(client: TestClient, auth_header) -> None:
    """/risk/forecast and /reports/forecast must accept the same range."""
    header = admin(auth_header)
    for horizon in (0, 366):
        assert (
            client.get(f"{FORECAST_URL}?horizon_days={horizon}", headers=header).status_code == 422
        )
        assert (
            client.get(
                f"/api/v1/reports/forecast?horizon_days={horizon}", headers=header
            ).status_code
            == 422
        )
