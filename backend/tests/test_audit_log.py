"""Tests for the audit trail written by the RBAC guards.

N1 requires proof that an entry is written on both success and denial, for
every risk and patient-access endpoint. These hit the real HTTP routes
through the guarded dependencies rather than calling audit_service directly,
so a regression in the guard wiring - not just in audit_service itself -
would fail here.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.patient import Patient


def _entries(db_session: Session) -> list[AuditLog]:
    """Return every audit row written so far, oldest first."""
    return db_session.query(AuditLog).order_by(AuditLog.id).all()


# --- patient access ---------------------------------------------------------


def test_allowed_patient_access_is_audited(
    client: TestClient, db_session: Session, patients: list[Patient], auth_header
) -> None:
    """A doctor listing their patients leaves a success entry naming them."""
    response = client.get("/api/v1/patients", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200

    rows = _entries(db_session)
    assert len(rows) == 1
    assert rows[0].outcome == "success"
    assert rows[0].actor_role == "doctor"
    assert rows[0].action == "patient:read_assigned"
    assert rows[0].resource_type == "patient"


def test_denied_patient_access_is_audited(
    client: TestClient, db_session: Session, auth_header
) -> None:
    """A researcher blocked from the identified list still leaves a record."""
    response = client.get("/api/v1/patients", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 403

    rows = _entries(db_session)
    assert len(rows) == 1
    assert rows[0].outcome == "denied"
    assert rows[0].actor_role == "researcher"


def test_audited_actor_id_matches_the_caller(
    client: TestClient, db_session: Session, patients: list[Patient], auth_header, users
) -> None:
    """The stored actor_id is a real foreign key, not a placeholder."""
    client.get("/api/v1/patients", headers=auth_header(Role.DOCTOR))

    row = _entries(db_session)[0]
    assert row.actor_id == users[Role.DOCTOR].id


def test_resource_id_is_captured_from_the_path(
    client: TestClient, db_session: Session, patients: list[Patient], auth_header
) -> None:
    """Reading one patient's detail records which patient, not just that a read happened."""
    patient_id = patients[0].id
    response = client.get(f"/api/v1/patients/{patient_id}", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200

    row = _entries(db_session)[0]
    assert row.resource_type == "patient"
    assert row.resource_id == str(patient_id)


def test_unauthenticated_patient_request_is_not_audited(
    client: TestClient, db_session: Session
) -> None:
    """No token means get_current_user rejects before any guard runs; nothing to log yet."""
    response = client.get("/api/v1/patients")
    assert response.status_code == 401
    assert _entries(db_session) == []


def test_disabled_account_denial_is_audited(
    client: TestClient, db_session: Session, patients: list[Patient], users, auth_header
) -> None:
    """Disabling an account mid-session produces a denied entry, not a silent 403."""
    header = auth_header(Role.DOCTOR)
    assert client.get("/api/v1/patients", headers=header).status_code == 200

    users[Role.DOCTOR].is_active = False
    db_session.commit()

    response = client.get("/api/v1/patients", headers=header)
    assert response.status_code == 403

    rows = _entries(db_session)
    assert len(rows) == 2
    assert rows[0].outcome == "success"
    assert rows[1].outcome == "denied"
    assert rows[1].actor_id == users[Role.DOCTOR].id


def test_patient_write_is_audited_for_both_outcomes(
    client: TestClient, db_session: Session, auth_header
) -> None:
    """Creating a patient is guarded by patient:write, held only by system_admin."""
    payload = {
        "medical_record_number": "MRN-AUDIT",
        "age_group": "[60-70)",
        "gender": "Female",
        "primary_diagnosis": "428",
    }
    denied = client.post("/api/v1/patients", json=payload, headers=auth_header(Role.RESEARCHER))
    assert denied.status_code == 403

    allowed = client.post("/api/v1/patients", json=payload, headers=auth_header(Role.SYSTEM_ADMIN))
    assert allowed.status_code == 201

    rows = _entries(db_session)
    assert [row.outcome for row in rows] == ["denied", "success"]
    assert all(row.action == "patient:write" for row in rows)


# --- risk access -------------------------------------------------------------


def test_allowed_risk_predict_is_audited(
    client: TestClient,
    db_session: Session,
    patients: list[Patient],
    auth_header,
    monkeypatch,
) -> None:
    """A successful prediction is audited even though its patient id lives in the body, not the path."""
    from app.services import model_service

    monkeypatch.setattr(model_service, "predict_probability", lambda features: 0.2)
    monkeypatch.setattr(model_service, "model_version", lambda: "test-model")

    payload = {
        "patient_id": patients[0].id,
        "time_in_hospital": 4,
        "num_medications": 10,
        "num_lab_procedures": 30,
        "number_diagnoses": 5,
        "number_inpatient": 0,
        "number_emergency": 0,
        "age_group": "[70-80)",
    }
    response = client.post("/api/v1/risk/predict", json=payload, headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200
    model_service.reset_cache()

    row = _entries(db_session)[0]
    assert row.outcome == "success"
    assert row.action == "risk_report:read"
    assert row.resource_type == "risk_report"


def test_denied_risk_forecast_is_audited(
    client: TestClient, db_session: Session, auth_header
) -> None:
    """A researcher lacks readmission_forecast:read; the denial is still logged."""
    response = client.get("/api/v1/risk/forecast", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 403

    row = _entries(db_session)[0]
    assert row.outcome == "denied"
    assert row.action == "readmission_forecast:read"


def test_every_risk_and_patient_route_leaves_exactly_one_entry(
    client: TestClient, db_session: Session, patients: list[Patient], auth_header
) -> None:
    """Guard-level logging fires once per guarded request, never zero and never twice."""
    routes = [
        "/api/v1/patients",
        "/api/v1/patients/stats",
        f"/api/v1/patients/{patients[0].id}",
        "/api/v1/risk/high-risk",
        "/api/v1/risk/forecast",
    ]
    for path in routes:
        client.get(path, headers=auth_header(Role.DOCTOR))

    assert len(_entries(db_session)) == len(routes)
