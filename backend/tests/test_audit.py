"""Audit trail tests.

The interface tells every user that patient record access is logged. These tests
are what make that sentence true: each way of reading patient data must leave a
row naming who did it.
"""

import pytest

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.prediction import RiskPrediction


def actions(db) -> list[str]:
    return [row.action for row in db.query(AuditLog).order_by(AuditLog.id)]


def test_opening_a_patient_record_is_logged(
    client, db, make_user, make_patient, auth_header
) -> None:
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)

    client.get(f"/api/v1/patients/{patient.id}", headers=auth_header(doctor))

    entry = db.query(AuditLog).filter(AuditLog.action == "patient.read").one()
    assert entry.actor_id == doctor.id
    assert entry.actor_role == "doctor"
    assert entry.resource == f"patient:{patient.id}"


def test_listing_patients_is_logged_with_how_many_were_returned(
    client, db, make_user, make_patient, auth_header
) -> None:
    doctor = make_user(Role.DOCTOR)
    for _ in range(3):
        make_patient(assigned_doctor_id=doctor.id)

    client.get("/api/v1/patients", headers=auth_header(doctor))

    entry = db.query(AuditLog).filter(AuditLog.action == "patient.list").one()
    assert entry.resource == "returned:3"


def test_a_researchers_cohort_view_is_logged(
    client, db, make_user, make_patient, auth_header
) -> None:
    make_patient()
    researcher = make_user(Role.RESEARCHER)

    client.get("/api/v1/patients/anonymised", headers=auth_header(researcher))

    assert "research.cohort_view" in actions(db)


def test_reading_a_risk_score_is_logged(client, db, make_user, make_patient, auth_header) -> None:
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    db.add(
        RiskPrediction(
            patient_id=patient.id,
            readmission_probability=0.2,
            risk_category="high",
            model_name="m",
            model_version="1",
        )
    )
    db.commit()

    client.get(f"/api/v1/risk/patients/{patient.id}", headers=auth_header(doctor))

    entry = db.query(AuditLog).filter(AuditLog.action == "risk.read").one()
    assert entry.resource == f"patient:{patient.id}"


def test_a_refused_read_does_not_look_like_an_access(
    client, db, make_user, make_patient, auth_header
) -> None:
    """A 404 for someone else's patient is not a read, and must not be logged as one."""
    mine = make_user(Role.DOCTOR)
    theirs = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=theirs.id)

    response = client.get(f"/api/v1/patients/{patient.id}", headers=auth_header(mine))

    assert response.status_code == 404
    assert "patient.read" not in actions(db)


@pytest.mark.parametrize(
    "path",
    ["/api/v1/patients", "/api/v1/treatment", "/api/v1/reports/hospital-performance"],
)
def test_an_unauthenticated_request_leaves_no_audit_row(client, db, path: str) -> None:
    client.get(path)
    assert db.query(AuditLog).count() == 0


def test_the_audit_log_records_when_it_happened(
    client, db, make_user, make_patient, auth_header
) -> None:
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    client.get(f"/api/v1/patients/{patient.id}", headers=auth_header(doctor))

    entry = db.query(AuditLog).filter(AuditLog.action == "patient.read").one()
    assert entry.created_at is not None
