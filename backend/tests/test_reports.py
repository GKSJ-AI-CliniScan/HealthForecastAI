"""Forecasting and risk report tests - Milestone 2 (FR-RPT-02, FR-RPT-03).

These pin the two things a report must never get wrong: who may read one, and
how wide the data inside it is. A report that leaks a patient outside the
caller's scope is the same defect as a patient endpoint that does, so the scope
cases here mirror test_patients.py.
"""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import create_access_token
from app.models.prediction import RiskPrediction
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.doctor_patient_repository import DoctorPatientRepository

# An obvious placeholder, not a credential.
PASSWORD = "example-Passw0rd-1"

FORECAST_URL = "/api/v1/reports/forecast"


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
    token = create_access_token(subject=str(doctor.id), role=str(Role.DOCTOR))
    return {"Authorization": f"Bearer {token}"}


def create_patient(client: TestClient, auth_header, mrn: str, **extra) -> dict:
    payload = {"medical_record_number": mrn, **extra}
    response = client.post("/api/v1/patients", json=payload, headers=admin(auth_header))
    assert response.status_code == 201, response.text
    return response.json()


def score(
    db: Session,
    patient_id: int,
    probability: float,
    category: str,
    minutes_ago: int = 0,
) -> RiskPrediction:
    """Insert a stored prediction directly.

    Reports read risk_predictions; they never invoke the model, so seeding the
    table keeps these tests independent of a trained artifact being present.
    """
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


# ---------------------------------------------------------------------------
# Authorisation - the SRS RBAC matrix row "Risk Prediction Reports"
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.DOCTOR, 200),
        (Role.HOSPITAL_ADMIN, 200),
        (Role.SYSTEM_ADMIN, 200),
        (Role.RESEARCHER, 200),
    ],
)
def test_forecast_report_matches_the_access_matrix(
    client: TestClient, auth_header, role: Role, expected: int
) -> None:
    """Every role the matrix grants some risk reporting may read the forecast."""
    response = client.get(FORECAST_URL, headers=auth_header(role))
    assert response.status_code == expected


def test_forecast_report_rejects_an_anonymous_caller(client: TestClient) -> None:
    """No report is readable without a token."""
    assert client.get(FORECAST_URL).status_code == 401


def test_researcher_never_receives_patient_rows(client: TestClient, auth_header) -> None:
    """Aggregated only: a researcher gets figures, never identifiable patients."""
    response = client.get(FORECAST_URL, headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 200
    body = response.json()
    assert body["high_risk_patients"] is None
    assert body["metadata"]["scope"] == "aggregated"


def test_researcher_is_refused_a_patient_report(client: TestClient, auth_header) -> None:
    """A per-patient report is identifiable by definition."""
    response = client.get("/api/v1/reports/patients/1", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 403


def test_administrator_receives_the_cohort(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A hospital wide role sees the identifiable high risk cohort."""
    created = create_patient(client, auth_header, "MRN-RPT-100")
    score(db_session, created["id"], 0.91, "high")

    body = client.get(FORECAST_URL, headers=admin(auth_header)).json()
    assert body["high_risk_patients"] is not None
    assert [row["patient_id"] for row in body["high_risk_patients"]] == [created["id"]]


# ---------------------------------------------------------------------------
# Scope - a report is never wider than the caller's patient list
# ---------------------------------------------------------------------------


def test_doctor_forecast_covers_only_their_caseload(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A doctor reports on their own patients, not the hospital."""
    doctor = make_doctor(db_session, "report.scope@hospital.org")
    mine = create_patient(client, auth_header, "MRN-RPT-200", assigned_doctor_id=doctor.id)
    theirs = create_patient(client, auth_header, "MRN-RPT-201")
    score(db_session, mine["id"], 0.88, "high")
    score(db_session, theirs["id"], 0.95, "high")

    body = client.get(FORECAST_URL, headers=doctor_header(doctor)).json()
    assert body["patients_in_scope"] == 1
    assert body["patients_scored"] == 1
    assert [row["patient_id"] for row in body["high_risk_patients"]] == [mine["id"]]
    assert body["metadata"]["scope"] == "assigned_patients"


def test_doctor_forecast_includes_a_patient_granted_through_the_map(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Co-managed patients count, because reports reuse scope_clause.

    A report that filtered on assigned_doctor_id alone would hide a high risk
    patient the doctor is entitled to see - the exact defect this guards.
    """
    doctor = make_doctor(db_session, "report.mapped@hospital.org")
    shared = create_patient(client, auth_header, "MRN-RPT-210")
    DoctorPatientRepository(db_session).assign(doctor_id=doctor.id, patient_id=shared["id"])
    score(db_session, shared["id"], 0.87, "high")

    body = client.get(FORECAST_URL, headers=doctor_header(doctor)).json()
    assert [row["patient_id"] for row in body["high_risk_patients"]] == [shared["id"]]


def test_doctor_gets_404_for_a_patient_report_outside_scope(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """404, not 403 - matching the patient endpoints, so existence stays hidden."""
    doctor = make_doctor(db_session, "report.outside@hospital.org")
    other = create_patient(client, auth_header, "MRN-RPT-220")

    response = client.get(f"/api/v1/reports/patients/{other['id']}", headers=doctor_header(doctor))
    assert response.status_code == 404


def test_patient_report_returns_404_when_the_patient_is_missing(
    client: TestClient, auth_header
) -> None:
    """An unknown id is the same 404 as an out of scope one."""
    assert (
        client.get("/api/v1/reports/patients/999999", headers=admin(auth_header)).status_code == 404
    )


# ---------------------------------------------------------------------------
# Report content
# ---------------------------------------------------------------------------


def test_patient_report_composes_risk_and_history(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The report carries the latest score plus the admissions behind it."""
    created = create_patient(
        client, auth_header, "MRN-RPT-300", age_group="[70-80)", primary_diagnosis="CHF"
    )
    for payload in (
        {"admission_date": "2026-01-01", "discharge_date": "2026-01-12", "readmitted": "<30"},
        {"admission_date": "2026-02-01", "discharge_date": "2026-02-04", "readmitted": "NO"},
    ):
        response = client.post(
            f"/api/v1/patients/{created['id']}/admissions",
            json=payload,
            headers=admin(auth_header),
        )
        assert response.status_code == 201, response.text
    score(db_session, created["id"], 0.42, "high")

    body = client.get(
        f"/api/v1/reports/patients/{created['id']}", headers=admin(auth_header)
    ).json()

    assert body["medical_record_number"] == "MRN-RPT-300"
    assert body["risk_category"] == "high"
    assert body["readmission_probability"] == pytest.approx(0.42)
    assert body["total_admissions"] == 2
    assert body["readmitted_total"] == 1
    assert body["readmissions_by_label"]["<30"] == 1
    assert body["metadata"]["report_version"]
    assert body["risk_factors"]


def test_patient_report_uses_only_the_latest_prediction(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A re-scored patient reports their newest score, not their first."""
    created = create_patient(client, auth_header, "MRN-RPT-310")
    score(db_session, created["id"], 0.90, "high", minutes_ago=60)
    score(db_session, created["id"], 0.05, "low", minutes_ago=0)

    body = client.get(
        f"/api/v1/reports/patients/{created['id']}", headers=admin(auth_header)
    ).json()
    assert body["risk_category"] == "low"
    assert body["readmission_probability"] == pytest.approx(0.05)


def test_patient_report_explains_an_unscored_patient(client: TestClient, auth_header) -> None:
    """A never-scored patient reports null risk and says why, rather than 500."""
    created = create_patient(client, auth_header, "MRN-RPT-320")
    body = client.get(
        f"/api/v1/reports/patients/{created['id']}", headers=admin(auth_header)
    ).json()

    assert body["readmission_probability"] is None
    assert body["risk_category"] is None
    assert any("no stored risk prediction" in note for note in body["metadata"]["notes"])


def test_forecast_report_counts_risk_bands(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The distribution reflects each patient's latest band."""
    for index, (mrn, probability, band) in enumerate(
        [
            ("MRN-RPT-400", 0.85, "high"),
            ("MRN-RPT-401", 0.15, "medium"),
            ("MRN-RPT-402", 0.02, "low"),
        ]
    ):
        created = create_patient(client, auth_header, mrn)
        score(db_session, created["id"], probability, band, minutes_ago=index)

    body = client.get(FORECAST_URL, headers=admin(auth_header)).json()
    assert body["risk_distribution"] == {"low": 1, "medium": 1, "high": 1}
    assert body["patients_scored"] == 3


def test_forecast_horizons_scale_linearly(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """60 days projects exactly twice the 30 day rate - the documented model."""
    created = create_patient(client, auth_header, "MRN-RPT-410")
    score(db_session, created["id"], 0.20, "medium")

    body = client.get(
        f"{FORECAST_URL}?horizon_days=30&horizon_days=60", headers=admin(auth_header)
    ).json()
    horizons = {row["horizon_days"]: row["predicted_rate"] for row in body["horizons"]}
    assert horizons[30] == pytest.approx(0.20)
    assert horizons[60] == pytest.approx(0.40)


def test_forecast_rate_is_capped_at_one(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A long horizon cannot produce a probability above 1.0."""
    created = create_patient(client, auth_header, "MRN-RPT-420")
    score(db_session, created["id"], 0.90, "high")

    body = client.get(f"{FORECAST_URL}?horizon_days=365", headers=admin(auth_header)).json()
    assert body["horizons"][0]["predicted_rate"] == 1.0


def test_forecast_report_on_an_empty_database(client: TestClient, auth_header) -> None:
    """Zero scored patients yields zeros and a notice, never a division error."""
    body = client.get(FORECAST_URL, headers=admin(auth_header)).json()
    assert body["patients_scored"] == 0
    assert body["coverage_rate"] == 0.0
    assert all(row["predicted_readmissions"] == 0 for row in body["horizons"])
    assert any("have a stored risk prediction" in note for note in body["metadata"]["notes"])


def test_forecast_reports_partial_coverage(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Unscored patients are counted and called out, per the SRS notice rule."""
    scored = create_patient(client, auth_header, "MRN-RPT-430")
    create_patient(client, auth_header, "MRN-RPT-431")
    score(db_session, scored["id"], 0.30, "high")

    body = client.get(FORECAST_URL, headers=admin(auth_header)).json()
    assert body["patients_in_scope"] == 2
    assert body["patients_scored"] == 1
    assert body["coverage_rate"] == pytest.approx(0.5)
    assert any("no stored prediction" in note for note in body["metadata"]["notes"])


def test_include_patients_false_omits_the_cohort(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The caller may ask for aggregates only."""
    created = create_patient(client, auth_header, "MRN-RPT-440")
    score(db_session, created["id"], 0.80, "high")

    body = client.get(f"{FORECAST_URL}?include_patients=false", headers=admin(auth_header)).json()
    assert body["high_risk_patients"] == []


# ---------------------------------------------------------------------------
# Validation and audit
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("horizon", [0, -30, 400])
def test_forecast_rejects_an_out_of_range_horizon(
    client: TestClient, auth_header, horizon: int
) -> None:
    """An implausible horizon is refused with 422, never a 500."""
    response = client.get(f"{FORECAST_URL}?horizon_days={horizon}", headers=admin(auth_header))
    assert response.status_code == 422


def test_forecast_rejects_a_non_numeric_horizon(client: TestClient, auth_header) -> None:
    """FastAPI coercion refuses a non-integer horizon."""
    response = client.get(f"{FORECAST_URL}?horizon_days=abc", headers=admin(auth_header))
    assert response.status_code == 422


def test_report_generation_is_audited(client: TestClient, auth_header, db_session: Session) -> None:
    """FR-AUD: generating a report is a recorded action."""
    created = create_patient(client, auth_header, "MRN-RPT-500")
    client.get(f"/api/v1/reports/patients/{created['id']}", headers=admin(auth_header))
    client.get(FORECAST_URL, headers=admin(auth_header))

    actions = [entry.action for entry in AuditRepository(db_session).list_recent()]
    assert "report.patient" in actions
    assert "report.forecast" in actions


def test_out_of_scope_report_attempt_is_audited_as_a_failure(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A refused report read leaves the entry an investigation needs."""
    doctor = make_doctor(db_session, "report.prober@hospital.org")
    other = create_patient(client, auth_header, "MRN-RPT-510")

    client.get(f"/api/v1/reports/patients/{other['id']}", headers=doctor_header(doctor))

    failures = [
        entry
        for entry in AuditRepository(db_session).list_recent()
        if entry.action == "patient.read" and entry.outcome == "failure"
    ]
    assert len(failures) == 1
    assert failures[0].actor_id == doctor.id
