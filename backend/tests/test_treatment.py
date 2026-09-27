"""Tests for treatment effectiveness: repository aggregates, service business
logic, and the API endpoints, including the doctor "limited" RBAC fix and the
diagnosis-comparison cohort-size guard.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.repositories.treatment_repository import TreatmentRepository
from app.services.patient_service import CohortTooSmallError
from app.services.treatment_service import MIN_COMPARISON_SAMPLE_SIZE, TreatmentService


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


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
        TreatmentService(db_session).compare_treatments("Rare condition")
    assert exc_info.value.minimum == MIN_COMPARISON_SAMPLE_SIZE


def test_compare_treatments_succeeds_at_the_minimum_sample(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-TRT-8", primary_diagnosis="Common condition")
    admission = _make_admission(db_session, patient.id, readmitted="NO")
    for _ in range(MIN_COMPARISON_SAMPLE_SIZE):
        _make_outcome(db_session, admission.id)

    rows = TreatmentService(db_session).compare_treatments("Common condition")
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
