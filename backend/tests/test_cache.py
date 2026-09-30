"""The report cache - Milestone 4.

The dangerous failure of a cache in a clinical system is serving one person the
numbers computed for another, so most of these are about the key.
"""

from types import SimpleNamespace

import pytest

from app.core import cache
from app.core.cache import ttl_cache
from app.core.config import settings
from app.core.rbac import Role


@pytest.fixture(autouse=True)
def enabled(monkeypatch):
    monkeypatch.setattr(settings, "CACHE_TTL_SECONDS", 60)
    cache.clear()
    yield
    cache.clear()


def user(role: Role, user_id: int):
    return SimpleNamespace(role=role, id=user_id)


def make_counter():
    calls = []

    @ttl_cache
    def report(db, actor, flag=None):
        calls.append((actor.id, flag))
        return {"n": len(calls), "items": [1, 2]}

    return report, calls


def test_a_repeat_call_is_served_without_recomputing() -> None:
    report, calls = make_counter()
    admin = user(Role.HOSPITAL_ADMIN, 1)
    assert report(None, admin) == report(None, admin)
    assert len(calls) == 1


def test_two_doctors_never_share_a_result() -> None:
    """A doctor's numbers are their own caseload: the key must include who they are."""
    report, calls = make_counter()
    report(None, user(Role.DOCTOR, 1))
    report(None, user(Role.DOCTOR, 2))
    assert len(calls) == 2


def test_administrators_share_a_result_because_theirs_is_hospital_wide() -> None:
    report, calls = make_counter()
    report(None, user(Role.HOSPITAL_ADMIN, 1))
    report(None, user(Role.HOSPITAL_ADMIN, 2))
    assert len(calls) == 1


def test_different_roles_do_not_share() -> None:
    report, calls = make_counter()
    report(None, user(Role.HOSPITAL_ADMIN, 1))
    report(None, user(Role.RESEARCHER, 1))
    assert len(calls) == 2


def test_different_arguments_are_cached_separately() -> None:
    report, calls = make_counter()
    admin = user(Role.HOSPITAL_ADMIN, 1)
    report(None, admin, flag="a")
    report(None, admin, flag="b")
    report(None, admin, flag="a")
    assert len(calls) == 2


def test_a_caller_that_mutates_a_result_cannot_poison_the_next_reader() -> None:
    report, _ = make_counter()
    admin = user(Role.HOSPITAL_ADMIN, 1)
    first = report(None, admin)
    first["items"].append(999)
    assert report(None, admin)["items"] == [1, 2]


def test_an_entry_expires(monkeypatch) -> None:
    report, calls = make_counter()
    admin = user(Role.HOSPITAL_ADMIN, 1)
    clock = {"now": 1000.0}
    monkeypatch.setattr(cache.time, "monotonic", lambda: clock["now"])

    report(None, admin)
    clock["now"] += 59
    report(None, admin)
    assert len(calls) == 1

    clock["now"] += 2
    report(None, admin)
    assert len(calls) == 2


def test_a_ttl_of_zero_disables_the_cache(monkeypatch) -> None:
    monkeypatch.setattr(settings, "CACHE_TTL_SECONDS", 0)
    report, calls = make_counter()
    admin = user(Role.HOSPITAL_ADMIN, 1)
    report(None, admin)
    report(None, admin)
    assert len(calls) == 2


def test_the_cache_is_bounded(monkeypatch) -> None:
    monkeypatch.setattr(cache, "_MAX_ENTRIES", 5)
    report, _ = make_counter()
    admin = user(Role.HOSPITAL_ADMIN, 1)
    for i in range(20):
        report(None, admin, flag=i)
    assert len(cache._store) <= 5


def test_authorisation_and_audit_still_run_on_a_cache_hit(
    client, db, make_user, make_patient, auth_header
) -> None:
    """The cache sits below the permission check: a hit must not skip either."""
    from app.models.audit_log import AuditLog

    make_patient()
    admin = make_user(Role.HOSPITAL_ADMIN)
    doctor = make_user(Role.DOCTOR)

    assert client.get("/api/v1/analytics/summary", headers=auth_header(admin)).status_code == 200
    assert client.get("/api/v1/analytics/summary", headers=auth_header(admin)).status_code == 200
    # ...and a role without the permission is still refused even though a result is cached.
    assert client.get("/api/v1/analytics/summary", headers=auth_header(doctor)).status_code == 403
    assert client.get("/api/v1/analytics/summary").status_code == 401

    # Patient reads are audited on every call, cached aggregates or not.
    patient = make_patient(assigned_doctor_id=doctor.id)
    for _ in range(2):
        client.get(f"/api/v1/patients/{patient.id}", headers=auth_header(doctor))
    assert db.query(AuditLog).filter(AuditLog.action == "patient.read").count() == 2
