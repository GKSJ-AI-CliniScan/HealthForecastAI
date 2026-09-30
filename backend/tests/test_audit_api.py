"""Reading the audit trail - Milestone 4."""

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.services import auth_service


def seed(db) -> None:
    for i in range(7):
        auth_service.record_audit(db, "patient.read", 10 + i % 2, "doctor", f"patient:{i}")
    auth_service.record_audit(db, "auth.login", None, None, "x@y.z", "failure")
    db.commit()


def test_only_the_system_administrator_can_read_the_trail(client, make_user, auth_header) -> None:
    for role in (Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.RESEARCHER):
        assert client.get("/api/v1/audit", headers=auth_header(make_user(role))).status_code == 403


def test_the_trail_is_newest_first_and_paginated(client, db, make_user, auth_header) -> None:
    seed(db)
    admin = make_user(Role.SYSTEM_ADMIN)
    page = client.get(
        "/api/v1/audit?action=patient.read&limit=3", headers=auth_header(admin)
    ).json()

    assert page["total"] == 7 and len(page["items"]) == 3
    stamps = [(row["created_at"], row["id"]) for row in page["items"]]
    assert stamps == sorted(stamps, reverse=True)

    second = client.get(
        "/api/v1/audit?action=patient.read&limit=3&offset=3", headers=auth_header(admin)
    ).json()
    assert {r["id"] for r in page["items"]}.isdisjoint({r["id"] for r in second["items"]})


def test_the_trail_can_be_filtered(client, db, make_user, auth_header) -> None:
    seed(db)
    admin = make_user(Role.SYSTEM_ADMIN)
    headers = auth_header(admin)

    reads = client.get("/api/v1/audit?action=patient.read", headers=headers).json()
    assert reads["total"] == 7 and all(r["action"] == "patient.read" for r in reads["items"])

    failures = client.get("/api/v1/audit?outcome=failure", headers=headers).json()
    assert all(r["outcome"] == "failure" for r in failures["items"]) and failures["total"] >= 1

    one_actor = client.get("/api/v1/audit?actor_id=10", headers=headers).json()
    assert one_actor["total"] == 4 and all(r["actor_id"] == 10 for r in one_actor["items"])


def test_reading_the_trail_is_itself_recorded_after_the_read(
    client, db, make_user, auth_header
) -> None:
    admin = make_user(Role.SYSTEM_ADMIN)
    first = client.get("/api/v1/audit?action=audit.read", headers=auth_header(admin)).json()
    assert first["total"] == 0, "a read must not appear in its own result"

    second = client.get("/api/v1/audit?action=audit.read", headers=auth_header(admin)).json()
    assert second["total"] == 1
    assert db.query(AuditLog).filter(AuditLog.action == "audit.read").count() == 2


def test_the_page_size_is_bounded(client, make_user, auth_header) -> None:
    admin = make_user(Role.SYSTEM_ADMIN)
    assert client.get("/api/v1/audit?limit=5000", headers=auth_header(admin)).status_code == 422
