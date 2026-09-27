"""Tests for treatment effectiveness: repository aggregates, service business
logic, and the API endpoints, including the doctor "limited" RBAC fix and the
diagnosis-comparison cohort-size guard.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.rbac import Role
from app.core.security import create_access_token
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.repositories.treatment_repository import TreatmentRepository
from app.services.patient_service import CohortTooSmallError
from app.services.treatment_service import (
    MIN_COMPARISON_SAMPLE_SIZE,
    TreatmentNotFoundError,
    TreatmentService,
)

HOSPITAL_ADMIN = CurrentUser(subject="1", role=Role.HOSPITAL_ADMIN)


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def _make_doctor(db_session: Session, email: str) -> User:
    user = User(
        email=email,
        full_name="Treatment Doctor",
        hashed_password="not-a-real-hash",
        role=str(Role.DOCTOR),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _doctor_header(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), str(Role.DOCTOR))}"}


def new_patient(client: TestClient, auth_header, mrn: str, **extra) -> dict:
    response = client.post(
        "/api/v1/patients", headers=admin(auth_header), json={"medical_record_number": mrn, **extra}
    )
    assert response.status_code == 201, response.text
    return response.json()


def new_admission(client: TestClient, auth_header, patient_id: int, **fields) -> dict:
    response = client.post(
        f"/api/v1/patients/{patient_id}/admissions", headers=admin(auth_header), json=fields
    )
    assert response.status_code == 201, response.text
    return response.json()


def _make_patient(db_session: Session, mrn: str, **overrides) -> Patient:
    patient = Patient(medical_record_number=mrn, **overrides)
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


def _make_admission(db_session: Session, patient_id: int, **overrides) -> Admission:
    admission = Admission(patient_id=patient_id, **overrides)
    db_session.add(admission)
    db_session.commit()
    db_session.refresh(admission)
    return admission


def _make_outcome(db_session: Session, admission_id: int, **overrides) -> TreatmentOutcome:
    defaults = {"treatment_name": "Beta blocker", "outcome": "improved", "recovery_score": 0.8}
    defaults.update(overrides)
    outcome = TreatmentOutcome(admission_id=admission_id, **defaults)
    db_session.add(outcome)
    db_session.commit()
    db_session.refresh(outcome)
    return outcome


# --------------------------------------------------------------------------
# TreatmentRepository
# --------------------------------------------------------------------------


def test_rates_by_treatment_computes_average_and_success_count(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-TRT-1")
    admission = _make_admission(db_session, patient.id)
    _make_outcome(
        db_session,
        admission.id,
        treatment_name="Beta blocker",
        outcome="improved",
        recovery_score=0.8,
    )
    _make_outcome(
        db_session,
        admission.id,
        treatment_name="Beta blocker",
        outcome="worsened",
        recovery_score=0.2,
    )

    rows = TreatmentRepository(db_session).rates_by_treatment()
    assert len(rows) == 1
    assert rows[0].treatment_name == "Beta blocker"
    assert rows[0].sample_size == 2
    assert rows[0].success_count == 1
    assert rows[0].average_recovery_score == pytest.approx(0.5)


def test_rates_by_treatment_filters_by_department(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-TRT-2")
    cardiology = _make_admission(db_session, patient.id, department="Cardiology")
    neurology = _make_admission(db_session, patient.id, department="Neurology")
    _make_outcome(db_session, cardiology.id, treatment_name="Beta blocker")
    _make_outcome(db_session, neurology.id, treatment_name="Beta blocker")

    rows = TreatmentRepository(db_session).rates_by_treatment(department="Cardiology")
    assert sum(row.sample_size for row in rows) == 1


def test_readmission_rate_for_treatment_counts_non_no_labels(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-TRT-3")
    readmitted = _make_admission(db_session, patient.id, readmitted="<30")
    not_readmitted = _make_admission(db_session, patient.id, readmitted="NO")
    _make_outcome(db_session, readmitted.id, treatment_name="Insulin")
    _make_outcome(db_session, not_readmitted.id, treatment_name="Insulin")

    readmitted_count, total = TreatmentRepository(db_session).readmission_rate_for_treatment(
        "Insulin"
    )
    assert (readmitted_count, total) == (1, 2)


def test_compare_by_diagnosis_only_includes_that_cohort(db_session: Session) -> None:
    cardiac = _make_patient(db_session, "MRN-TRT-4", primary_diagnosis="Cardiac failure")
    other = _make_patient(db_session, "MRN-TRT-5", primary_diagnosis="Diabetes")
    cardiac_admission = _make_admission(db_session, cardiac.id, readmitted="NO")
    other_admission = _make_admission(db_session, other.id, readmitted="NO")
    _make_outcome(db_session, cardiac_admission.id, treatment_name="Beta blocker")
    _make_outcome(db_session, other_admission.id, treatment_name="Insulin")

    rows = TreatmentRepository(db_session).compare_by_diagnosis("Cardiac failure")
    assert [row.treatment_name for row in rows] == ["Beta blocker"]


def test_recovery_trend_buckets_by_week_of_discharge(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-TRT-6")
    admission = _make_admission(db_session, patient.id, discharge_date=date(2026, 1, 5))
    _make_outcome(db_session, admission.id, recovery_score=0.6)

    points = TreatmentRepository(db_session).recovery_trend(weeks=12)
    assert len(points) == 1
    assert points[0].sample_size == 1
    assert points[0].average_recovery_score == pytest.approx(0.6)


# --------------------------------------------------------------------------
# TreatmentService
# --------------------------------------------------------------------------


def test_compare_treatments_raises_below_the_minimum_sample(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-TRT-7", primary_diagnosis="Rare condition")
    admission = _make_admission(db_session, patient.id)
    _make_outcome(db_session, admission.id)  # only 1 record, below MIN_COMPARISON_SAMPLE_SIZE

    with pytest.raises(CohortTooSmallError) as exc_info:
        TreatmentService(db_session).compare_treatments(HOSPITAL_ADMIN, "Rare condition")
    assert exc_info.value.minimum == MIN_COMPARISON_SAMPLE_SIZE


def test_compare_treatments_succeeds_at_the_minimum_sample(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-TRT-8", primary_diagnosis="Common condition")
    admission = _make_admission(db_session, patient.id, readmitted="NO")
    for _ in range(MIN_COMPARISON_SAMPLE_SIZE):
        _make_outcome(db_session, admission.id)

    rows = TreatmentService(db_session).compare_treatments(HOSPITAL_ADMIN, "Common condition")
    assert rows[0].sample_size == MIN_COMPARISON_SAMPLE_SIZE


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------


def test_record_and_list_treatment_outcome(client: TestClient, auth_header) -> None:
    patient = new_patient(client, auth_header, "MRN-TRT-EP-1")
    admission = new_admission(client, auth_header, patient["id"], admission_date="2026-01-01")

    response = client.post(
        f"/api/v1/patients/{patient['id']}/admissions/{admission['id']}/treatments",
        headers=admin(auth_header),
        json={"treatment_name": "Beta blocker", "outcome": "improved", "recovery_score": 0.9},
    )
    assert response.status_code == 201, response.text
    assert response.json()["treatment_name"] == "Beta blocker"

    listed = client.get(
        f"/api/v1/patients/{patient['id']}/admissions/{admission['id']}/treatments",
        headers=admin(auth_header),
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_record_treatment_outcome_rejects_an_invalid_outcome_value(
    client: TestClient, auth_header
) -> None:
    patient = new_patient(client, auth_header, "MRN-TRT-EP-2")
    admission = new_admission(client, auth_header, patient["id"])

    response = client.post(
        f"/api/v1/patients/{patient['id']}/admissions/{admission['id']}/treatments",
        headers=admin(auth_header),
        json={"treatment_name": "Beta blocker", "outcome": "cured"},
    )
    assert response.status_code == 422


def test_record_treatment_outcome_is_403_for_a_doctor(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """PATIENT_WRITE is system_admin only (the same gate create_admission
    already uses) - a doctor is rejected before scope is even checked, same
    as attempting to create an admission."""
    from app.core.security import create_access_token
    from app.models.user import User

    patient = new_patient(client, auth_header, "MRN-TRT-EP-3")
    admission = new_admission(client, auth_header, patient["id"])

    doctor = User(
        email="write.trt@hospital.org",
        full_name="Ward Doctor",
        hashed_password="not-a-real-hash",
        role=str(Role.DOCTOR),
        is_active=True,
    )
    db_session.add(doctor)
    db_session.commit()
    header = {"Authorization": f"Bearer {create_access_token(str(doctor.id), str(Role.DOCTOR))}"}

    response = client.post(
        f"/api/v1/patients/{patient['id']}/admissions/{admission['id']}/treatments",
        headers=header,
        json={"treatment_name": "Beta blocker"},
    )
    assert response.status_code == 403


def test_list_treatment_outcomes_is_404_for_an_admission_outside_doctor_scope(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The read path (get_current_active_user, not PATIENT_WRITE) does reach
    scope enforcement - an out-of-scope doctor gets 404, not 403."""
    from app.core.security import create_access_token
    from app.models.user import User

    patient = new_patient(client, auth_header, "MRN-TRT-EP-3B")
    admission = new_admission(client, auth_header, patient["id"])

    other_doctor = User(
        email="other.trt@hospital.org",
        full_name="Other Doctor",
        hashed_password="not-a-real-hash",
        role=str(Role.DOCTOR),
        is_active=True,
    )
    db_session.add(other_doctor)
    db_session.commit()
    header = {
        "Authorization": f"Bearer {create_access_token(str(other_doctor.id), str(Role.DOCTOR))}"
    }

    response = client.get(
        f"/api/v1/patients/{patient['id']}/admissions/{admission['id']}/treatments",
        headers=header,
    )
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.DOCTOR, 200),
        (Role.HOSPITAL_ADMIN, 200),
        (Role.RESEARCHER, 200),
        (Role.SYSTEM_ADMIN, 200),
    ],
)
def test_treatment_effectiveness_is_reachable_by_every_clinical_role(
    client: TestClient, auth_header, role: Role, expected: int
) -> None:
    """Doctor holds TREATMENT_REPORT_READ_LIMITED, not the full permission -
    the combined guard must not lock them out (SRS section 9)."""
    response = client.get("/api/v1/treatment", headers=auth_header(role))
    assert response.status_code == expected


def test_treatment_effectiveness_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/treatment").status_code == 401


def test_recovery_trends_endpoint_returns_a_series(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-TRT-EP-4")
    admission = _make_admission(db_session, patient.id, discharge_date=date(2026, 2, 2))
    _make_outcome(db_session, admission.id, recovery_score=0.7)

    response = client.get("/api/v1/treatment/recovery-trends", headers=admin(auth_header))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_readmission_reduction_endpoint(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-TRT-EP-5")
    admission = _make_admission(db_session, patient.id, readmitted="NO")
    _make_outcome(db_session, admission.id, treatment_name="Statins")

    response = client.get(
        "/api/v1/treatment/readmission-reduction?treatment_name=Statins", headers=admin(auth_header)
    )
    assert response.status_code == 200
    assert response.json()["treatment_name"] == "Statins"


def test_compare_endpoint_returns_422_for_a_small_cohort(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-TRT-EP-6", primary_diagnosis="Uncommon")
    admission = _make_admission(db_session, patient.id)
    _make_outcome(db_session, admission.id)

    response = client.get(
        "/api/v1/treatment/compare?diagnosis=Uncommon", headers=admin(auth_header)
    )
    assert response.status_code == 422
    assert response.json()["detail"]["error"] == "cohort_too_small"


# --------------------------------------------------------------------------
# Doctor scoping for TREATMENT_REPORT_READ_LIMITED
# --------------------------------------------------------------------------


def test_doctor_treatment_effectiveness_covers_only_their_own_patients(
    client: TestClient, auth_header, db_session: Session
) -> None:
    doctor = _make_doctor(db_session, "scope.trt@hospital.org")
    mine = _make_patient(db_session, "MRN-TRT-C-1", assigned_doctor_id=doctor.id)
    other = _make_patient(db_session, "MRN-TRT-C-2")
    _make_outcome(db_session, _make_admission(db_session, mine.id).id, treatment_name="Insulin")
    _make_outcome(db_session, _make_admission(db_session, other.id).id, treatment_name="Insulin")
    _make_outcome(db_session, _make_admission(db_session, other.id).id, treatment_name="Statins")

    doctor_view = client.get("/api/v1/treatment", headers=_doctor_header(doctor)).json()
    assert len(doctor_view) == 1
    assert doctor_view[0]["treatment_name"] == "Insulin"
    assert doctor_view[0]["sample_size"] == 1

    admin_view = client.get("/api/v1/treatment", headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    assert {row["treatment_name"]: row["sample_size"] for row in admin_view} == {
        "Insulin": 2,
        "Statins": 1,
    }


def test_compare_guard_counts_only_the_doctors_scope(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Hospital-wide the diagnosis has enough records, but the doctor sees one."""
    doctor = _make_doctor(db_session, "compare.trt@hospital.org")
    mine = _make_patient(
        db_session, "MRN-TRT-C-3", primary_diagnosis="Asthma", assigned_doctor_id=doctor.id
    )
    other = _make_patient(db_session, "MRN-TRT-C-4", primary_diagnosis="Asthma")
    _make_outcome(db_session, _make_admission(db_session, mine.id).id)
    other_admission = _make_admission(db_session, other.id)
    for _ in range(MIN_COMPARISON_SAMPLE_SIZE):
        _make_outcome(db_session, other_admission.id)

    admin_response = client.get(
        "/api/v1/treatment/compare?diagnosis=Asthma", headers=admin(auth_header)
    )
    assert admin_response.status_code == 200

    doctor_response = client.get(
        "/api/v1/treatment/compare?diagnosis=Asthma", headers=_doctor_header(doctor)
    )
    assert doctor_response.status_code == 422
    assert doctor_response.json()["detail"] == {
        "error": "cohort_too_small",
        "minimum": MIN_COMPARISON_SAMPLE_SIZE,
        "actual": 1,
    }


def test_repository_scope_excludes_other_doctors_patients(db_session: Session) -> None:
    doctor = _make_doctor(db_session, "repo.trt@hospital.org")
    mine = _make_patient(db_session, "MRN-TRT-C-5", assigned_doctor_id=doctor.id)
    other = _make_patient(db_session, "MRN-TRT-C-6")
    _make_outcome(db_session, _make_admission(db_session, mine.id, readmitted="<30").id)
    _make_admission(db_session, other.id, readmitted="NO")

    repo = TreatmentRepository(db_session)
    assert repo.hospital_readmission_rate(doctor_id=doctor.id) == (1, 1)
    assert repo.hospital_readmission_rate() == (1, 2)


# --------------------------------------------------------------------------
# Outcome distribution / department effectiveness
# --------------------------------------------------------------------------


def test_outcome_distribution_has_a_stable_shape(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-TRT-C-7")
    admission = _make_admission(db_session, patient.id)
    _make_outcome(db_session, admission.id, treatment_name="Insulin", outcome="improved")
    _make_outcome(db_session, admission.id, treatment_name="Insulin", outcome="worsened")
    _make_outcome(db_session, admission.id, treatment_name="Insulin", outcome=None)

    response = client.get("/api/v1/treatment/outcomes", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json() == [
        {
            "treatment_name": "Insulin",
            "sample_size": 3,
            "outcomes": {
                "improved": 1,
                "unchanged": 0,
                "worsened": 1,
                "unknown": 0,
                "unrecorded": 1,
            },
        }
    ]


def test_outcome_distribution_filters_by_department(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-TRT-C-8")
    _make_outcome(db_session, _make_admission(db_session, patient.id, department="ICU").id)
    _make_outcome(db_session, _make_admission(db_session, patient.id, department="Ward").id)

    response = client.get("/api/v1/treatment/outcomes?department=ICU", headers=admin(auth_header))
    assert [row["sample_size"] for row in response.json()] == [1]


def test_department_effectiveness_groups_and_labels_unassigned(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-TRT-C-9")
    cardiology = _make_admission(db_session, patient.id, department="Cardiology", readmitted="<30")
    unassigned = _make_admission(db_session, patient.id, readmitted="NO")
    _make_outcome(db_session, cardiology.id, outcome="improved", recovery_score=0.9)
    _make_outcome(db_session, cardiology.id, outcome="worsened", recovery_score=0.1)
    _make_outcome(db_session, unassigned.id, outcome="improved")

    response = client.get("/api/v1/treatment/departments", headers=admin(auth_header))
    assert response.status_code == 200
    by_department = {row["department"]: row for row in response.json()}
    assert by_department["Cardiology"]["sample_size"] == 2
    assert by_department["Cardiology"]["success_rate"] == pytest.approx(0.5)
    assert by_department["Cardiology"]["readmission_rate"] == pytest.approx(1.0)
    assert by_department["Cardiology"]["average_recovery_score"] == pytest.approx(0.5)
    assert by_department["unassigned"]["readmission_rate"] == 0.0


def test_new_treatment_endpoints_refuse_a_role_without_a_treatment_permission(
    client: TestClient, auth_header, monkeypatch
) -> None:
    """Every role holds some treatment permission today, so the guard is
    exercised by stripping one role's grants for the duration of the test."""
    from app.core import rbac

    stripped = dict(rbac.PERMISSIONS)
    stripped[Role.HOSPITAL_ADMIN] = frozenset()
    monkeypatch.setattr(rbac, "PERMISSIONS", stripped)

    for path in ("/api/v1/treatment/outcomes", "/api/v1/treatment/departments"):
        assert client.get(path, headers=auth_header(Role.HOSPITAL_ADMIN)).status_code == 403


# --------------------------------------------------------------------------
# Not found / validation
# --------------------------------------------------------------------------


def test_readmission_reduction_is_404_for_a_treatment_with_no_outcomes(
    client: TestClient, auth_header
) -> None:
    response = client.get(
        "/api/v1/treatment/readmission-reduction?treatment_name=Nothing", headers=admin(auth_header)
    )
    assert response.status_code == 404


def test_readmission_reduction_service_raises_for_an_unknown_treatment(
    db_session: Session,
) -> None:
    with pytest.raises(TreatmentNotFoundError):
        TreatmentService(db_session).readmission_reduction(HOSPITAL_ADMIN, "Nothing")


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/treatment?treatment_name=",
        "/api/v1/treatment?department=" + "x" * 101,
        "/api/v1/treatment/outcomes?treatment_name=" + "x" * 256,
        "/api/v1/treatment/recovery-trends?weeks=0",
        "/api/v1/treatment/recovery-trends?weeks=105",
        "/api/v1/treatment/readmission-reduction",
        "/api/v1/treatment/compare",
        "/api/v1/treatment/compare?diagnosis=",
    ],
)
def test_treatment_filters_are_validated(client: TestClient, auth_header, path: str) -> None:
    assert client.get(path, headers=admin(auth_header)).status_code == 422


def test_list_treatment_outcomes_is_404_for_an_unknown_admission(
    client: TestClient, auth_header
) -> None:
    patient = new_patient(client, auth_header, "MRN-TRT-C-10")
    response = client.get(
        f"/api/v1/patients/{patient['id']}/admissions/9999/treatments", headers=admin(auth_header)
    )
    assert response.status_code == 404
