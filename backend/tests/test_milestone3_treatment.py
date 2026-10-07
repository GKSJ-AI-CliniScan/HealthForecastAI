"""Milestone 3 - treatment effectiveness analytics aggregate real rows, not baselines."""

from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.services import treatment_service


def _outcome(
    db: Session,
    make_patient: Callable[..., Patient],
    *,
    diagnosis: str = "Diabetes",
    protocol: str = "Metformin Monotherapy",
    readmitted: str = "NO",
    disposition: str = "Discharged to home",
    recovery_score: float = 90.0,
    stay: int = 3,
    assigned_to: User | None = None,
) -> TreatmentOutcome:
    """Create a patient -> admission -> treatment outcome chain."""
    patient = make_patient(
        primary_diagnosis=diagnosis,
        **({"assigned_doctor_id": assigned_to.id} if assigned_to else {}),
    )
    admission = Admission(
        patient_id=patient.id,
        time_in_hospital=stay,
        admission_type="Emergency",
        discharge_disposition=disposition,
        num_medications=10,
        num_lab_procedures=40,
        number_diagnoses=5,
        readmitted=readmitted,
    )
    db.add(admission)
    db.commit()
    db.refresh(admission)

    outcome = TreatmentOutcome(
        admission_id=admission.id,
        treatment_name=protocol,
        medication_change=False,
        recovery_score=recovery_score,
        length_of_stay_days=stay,
        outcome="Recovered",
    )
    db.add(outcome)
    db.commit()
    db.refresh(outcome)
    return outcome


def _data(response: Any) -> dict[str, Any]:
    """Assert the {success, data} contract and hand back the payload."""
    body = response.json()
    assert body["success"] is True, body
    return body["data"]


def test_summary_wraps_payload_in_success_envelope(
    client: TestClient, make_user, auth_header
) -> None:
    """The dashboard services unwrap `data`, so the envelope is the contract."""
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/treatment/summary", headers=auth_header(admin))
    assert response.status_code == 200
    data = _data(response)
    assert set(data) == {
        "successRate",
        "recoveryRate",
        "complicationsRate",
        "outcomesRecorded",
        "protocolsEvaluated",
        "diseaseGroup",
        "medicationsData",
        "recoveryProgressTrend",
    }


def test_summary_reports_zero_when_no_outcomes_exist(
    client: TestClient, make_user, auth_header
) -> None:
    """An empty table must read as empty.

    This is the regression guard: the module used to return five invented
    protocol rows with made-up success rates whenever the table was empty, which
    a reviewer could not tell apart from measured outcomes.
    """
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/treatment/summary", headers=auth_header(admin))
    data = _data(response)
    assert data["outcomesRecorded"] == 0
    assert data["medicationsData"] == []
    assert data["successRate"] == 0.0
    assert data["recoveryRate"] == 0.0


def test_success_rate_counts_only_30_day_readmissions(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """Success is the absence of a <30 readmission, so 3 of 4 rows is 75%."""
    for _ in range(3):
        _outcome(db, make_patient, protocol="Metformin Monotherapy", readmitted="NO")
    _outcome(db, make_patient, protocol="Metformin Monotherapy", readmitted="<30")

    admin = make_user(Role.HOSPITAL_ADMIN)
    data = _data(client.get("/api/v1/treatment/summary", headers=auth_header(admin)))

    assert data["outcomesRecorded"] == 4
    assert data["successRate"] == 75.0
    assert data["protocolsEvaluated"] == 1


def test_recovery_rate_uses_the_documented_target_threshold(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """Exactly the rows at or above RECOVERY_TARGET count as recovered."""
    target = treatment_service.RECOVERY_TARGET
    _outcome(db, make_patient, recovery_score=target)
    _outcome(db, make_patient, recovery_score=target - 0.1)

    admin = make_user(Role.HOSPITAL_ADMIN)
    data = _data(client.get("/api/v1/treatment/summary", headers=auth_header(admin)))
    assert data["recoveryRate"] == 50.0


def test_complication_rate_is_a_non_home_discharge(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """A transfer onward is the adverse signal; going home is not."""
    _outcome(db, make_patient, disposition="Discharged to home")
    _outcome(db, make_patient, disposition="Discharged/transferred to SNF")

    admin = make_user(Role.HOSPITAL_ADMIN)
    data = _data(client.get("/api/v1/treatment/summary", headers=auth_header(admin)))
    assert data["complicationsRate"] == 50.0
    assert data["medicationsData"][0]["sideEffectsRate"] == 50.0


def test_every_routine_home_disposition_counts_as_resolved(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """The seed and the service must agree on what "went home" means."""
    for disposition in treatment_service.ROUTINE_HOME_DISCHARGES:
        _outcome(db, make_patient, disposition=disposition)

    admin = make_user(Role.HOSPITAL_ADMIN)
    data = _data(client.get("/api/v1/treatment/summary", headers=auth_header(admin)))
    assert data["complicationsRate"] == 0.0


def test_disease_group_filter_narrows_the_cohort(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """A group filter must exclude other diagnoses from every figure."""
    _outcome(db, make_patient, diagnosis="Diabetes", protocol="Metformin Monotherapy")
    _outcome(db, make_patient, diagnosis="Circulatory", protocol="Beta Blocker Titration")

    admin = make_user(Role.HOSPITAL_ADMIN)
    headers = auth_header(admin)

    diabetes = _data(
        client.get("/api/v1/treatment/summary?disease_group=DIABETES", headers=headers)
    )
    assert diabetes["diseaseGroup"] == "DIABETES"
    assert diabetes["outcomesRecorded"] == 1
    assert [m["treatment"] for m in diabetes["medicationsData"]] == ["Metformin Monotherapy"]

    everything = _data(client.get("/api/v1/treatment/summary", headers=headers))
    assert everything["diseaseGroup"] == "All"
    assert everything["outcomesRecorded"] == 2


def test_unknown_disease_group_filters_nothing(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """A free-text group we do not map must not silently return an empty report."""
    _outcome(db, make_patient, diagnosis="Digestive")

    admin = make_user(Role.HOSPITAL_ADMIN)
    data = _data(
        client.get("/api/v1/treatment/summary?disease_group=nonsense", headers=auth_header(admin))
    )
    assert data["diseaseGroup"] == "All"
    assert data["outcomesRecorded"] == 1


def test_recovery_trends_bucket_by_day_of_stay(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """Stays past the chart horizon fold into the final bucket."""
    _outcome(db, make_patient, diagnosis="Circulatory", stay=2, recovery_score=80.0)
    _outcome(db, make_patient, diagnosis="Circulatory", stay=30, recovery_score=60.0)

    admin = make_user(Role.HOSPITAL_ADMIN)
    trends = _data(client.get("/api/v1/treatment/recovery-trends", headers=auth_header(admin)))

    assert [point["day"] for point in trends] == [
        "Day 2",
        "Day 3",
        "Day 4",
        "Day 5",
        "Day 6",
        "Day 7+",
    ]
    assert trends[0]["cardiac"] == 80.0
    assert trends[-1]["cardiac"] == 60.0
    # A Diabetes patient matches the renal cohort only.
    assert trends[0]["renal"] is None


def test_trends_do_not_extrapolate_before_the_first_observed_day(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """Filling inside the observed range is interpolation; before it is invention."""
    _outcome(db, make_patient, diagnosis="Respiratory", stay=5, recovery_score=88.0)

    admin = make_user(Role.HOSPITAL_ADMIN)
    trends = _data(client.get("/api/v1/treatment/recovery-trends", headers=auth_header(admin)))
    assert trends[0]["day"] == "Day 5"
    assert trends[0]["pulmonary"] == 88.0


def test_medications_endpoint_matrix(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """Per-protocol rows carry the rates the drug-outcome table renders."""
    _outcome(db, make_patient, protocol="Insulin Intensive Therapy", readmitted="<30")
    _outcome(db, make_patient, protocol="Insulin Intensive Therapy", readmitted="NO")

    admin = make_user(Role.HOSPITAL_ADMIN)
    rows = _data(client.get("/api/v1/treatment/medications", headers=auth_header(admin)))
    assert len(rows) == 1
    row = rows[0]
    assert row["treatment"] == "Insulin Intensive Therapy"
    assert row["patientsTreated"] == 2
    assert row["successRate"] == 50.0
    assert row["readmissionRate"] == 0.5


def test_doctor_sees_only_their_own_caseload(
    db: Session, make_user, make_patient, auth_header, client: TestClient
) -> None:
    """The matrix grants doctors a *limited* report: same numbers, own patients only."""
    doctor = make_user(Role.DOCTOR)
    other = make_user(Role.DOCTOR)

    _outcome(db, make_patient, assigned_to=doctor, protocol="Metformin Monotherapy")
    _outcome(db, make_patient, assigned_to=other, protocol="Beta Blocker Titration")

    mine = _data(client.get("/api/v1/treatment/summary", headers=auth_header(doctor)))
    assert mine["outcomesRecorded"] == 1
    assert [m["treatment"] for m in mine["medicationsData"]] == ["Metformin Monotherapy"]

    # An administrator holds the unscoped permission and sees both.
    admin = make_user(Role.HOSPITAL_ADMIN)
    theirs = _data(client.get("/api/v1/treatment/summary", headers=auth_header(admin)))
    assert theirs["outcomesRecorded"] == 2


def test_treatment_summary_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/treatment/summary").status_code in (401, 403)


def test_seed_cohort_dispositions_stay_in_step_with_the_service() -> None:
    """The seed writes dispositions the service classifies as routine or complicated."""
    from app.db import init_db

    assert set(init_db.ROUTINE_DISCHARGES) == treatment_service.ROUTINE_HOME_DISCHARGES
    complicated = set(init_db.COMPLICATED_DISCHARGES) - treatment_service.ROUTINE_HOME_DISCHARGES
    assert complicated == set(init_db.COMPLICATED_DISCHARGES)


def test_recovery_index_is_monotonic_in_each_penalty() -> None:
    """Every penalty term must only ever lower the index, and it stays bounded."""
    baseline = {
        "length_of_stay": 3,
        "number_diagnoses": 4,
        "num_medications": 8,
        "readmitted": "NO",
    }
    base = treatment_service.recovery_index(**baseline)
    assert 0.0 <= base <= 100.0

    for field, worse_value in (
        ("length_of_stay", 9),
        ("number_diagnoses", 9),
        ("num_medications", 20),
        ("readmitted", "<30"),
    ):
        worse = treatment_service.recovery_index(**{**baseline, field: worse_value})
        assert worse < base, field


def test_seeded_cohort_leaves_no_degenerate_slice(db: Session, make_user) -> None:
    """Every demo slice must contain both outcomes, or the dashboard looks broken.

    The seed is deterministic, so a readmission stride that happens to line up
    with a grouping stride zeroes out a whole segment - the first version made
    every Diabetes patient readmit and gave one doctor a 0% complication rate.
    """
    from app.db import init_db

    make_user(Role.DOCTOR)
    make_user(Role.DOCTOR)
    init_db.seed_sample_clinical_data(db)

    doctors = db.query(User).filter(User.role == Role.DOCTOR).all()
    assert len(doctors) == 2

    slices = [None] + [doctor.id for doctor in doctors]
    for doctor_id in slices:
        summary = treatment_service.get_treatment_summary(db, assigned_doctor_id=doctor_id)
        assert summary.outcomes_recorded > 0
        assert 0.0 < summary.success_rate < 100.0
        assert 0.0 < summary.complications_rate < 100.0

    for group in ("DIABETES", "CHF", "COPD", "PNEUMONIA"):
        summary = treatment_service.get_treatment_summary(db, group)
        assert summary.outcomes_recorded > 0, group
        assert 0.0 < summary.success_rate < 100.0, group
