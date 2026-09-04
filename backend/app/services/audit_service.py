"""Compliance audit trail: record who did what, to what, and whether they
were allowed to.

Called from the RBAC guards in app.api.deps. record() runs before the
endpoint body, so it covers every risk and patient-access endpoint without
each one having to remember to log itself. finalize() runs after the
endpoint body (or after a request-level exception, via the guards' yield),
so "success" in this table means the request actually completed, not just
that it was let past the permission check - a permission check that later
turns out to be out of the caller's row-level scope (a doctor, a patient
outside their assignment) is corrected to "denied" once that becomes known,
never left standing as "success".
"""

from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


# WHAT      : commit the audit entry immediately inside record(), instead of
#             leaving it for the caller's own db.commit().
# WHY       : several of the endpoints this is called ahead of - list
#             patients, list high-risk patients, the readmission forecast,
#             one patient's detail - are read-only and never call commit.
#             Without an eager commit here, the row would be added but never
#             persisted, and would vanish when the request-scoped session
#             closes: the compliance record would silently disappear for
#             every read, which is most of this platform's traffic.
# FOR WHOM  : app.api.deps.require_verified_permission and
#             require_any_verified_permission, called once per guarded
#             request.
# BENEFIT   : an audit entry survives regardless of what the endpoint does
#             afterwards - it does not depend on business logic remembering
#             to commit, or on that logic succeeding at all.
# COST      : one extra INSERT + COMMIT on every guarded request, including
#             ones that would otherwise be a single read query; on
#             PostgreSQL in production that is one extra fsync per request.
# ALTERNATIVES : (1) defer to the caller's own commit and accept that
#             read-only endpoints lose their audit trail; (2) write audit
#             entries through a second, dedicated connection so a failed
#             main transaction cannot roll back its own audit record too.
# CHOSEN BECAUSE : this is a healthcare platform under C2/C3 (never
#             fabricate, never swallow a failure) - an audit trail that is
#             optimistic about what was actually persisted is worse than the
#             extra write cost, and alternative (2) adds a second connection
#             pool for a problem an eager commit already solves.
def record(
    db: Session,
    *,
    actor_id: int | None,
    actor_role: str,
    action: str,
    resource_type: str | None,
    resource_id: str | None,
    outcome: str,
) -> AuditLog:
    """Write one audit entry and commit it immediately. Returns the row."""
    entry = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# WHAT      : update an already-written audit entry's outcome once the
#             request it covers has actually concluded, instead of creating
#             a second row.
# WHY       : the guard that calls record() runs before the endpoint body,
#             at the point a caller has cleared the permission and account
#             checks - not at the point the request actually succeeded. A
#             doctor requesting a patient outside their assignment clears
#             both checks and is only stopped afterwards, by row-level
#             scoping inside the endpoint (a 404, on purpose - see
#             risk.py/patients.py). Without this correction that attempt
#             reads as outcome="success" in the audit table, which is the
#             single most compliance-relevant case this table exists to
#             catch, misreported as the opposite of what happened.
# FOR WHOM  : app.api.deps's two guards, from inside a try/except wrapped
#             around their `yield` - the one point in a yield-dependency
#             where FastAPI hands back either a clean return or the
#             exception the endpoint raised.
# BENEFIT   : one row per request, whose final outcome matches what actually
#             happened - authorized-but-then-denied-by-scope is "denied",
#             authorized-but-then-failed (a 503, a 409) is "error", and
#             "success" means the response actually completed.
# COST      : a second UPDATE + COMMIT on the same row, so a guarded request
#             now does two audit writes instead of one; the row briefly
#             exists with a transient outcome ("authorized") between the two.
# ALTERNATIVES : (1) write a second, separate row from the scoping layer
#             (patient_service, risk_service) instead of correcting the
#             first one; (2) leave the guard-level row as the only source of
#             truth and accept it can be wrong about the ending.
# CHOSEN BECAUSE : (1) would mean two rows per cross-scope attempt - one
#             saying "success", one saying "denied" - which is worse than
#             one wrong row, and would require touching risk_service.py and
#             patient_service.py, which C10 says not to do without cause;
#             (2) is exactly the defect this function exists to fix.
def finalize(db: Session, entry: AuditLog, outcome: str) -> AuditLog:
    """Correct an existing entry's outcome to what the request actually did."""
    entry.outcome = outcome
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# WHAT      : let an endpoint attach the specific resource id it resolved to
#             the audit entry the guard already created for this request,
#             instead of creating a second row or having the guard re-read
#             the request body.
# WHY       : the guard derives resource_id from the URL's path parameters,
#             which works for "/patients/{patient_id}" but not for
#             POST /risk/predict - that route names its patient inside the
#             JSON body, which the guard runs before FastAPI has bound. The
#             endpoint itself already has that value from its own `payload`
#             parameter (no re-parsing needed) the moment FastAPI resolves it.
# FOR WHOM  : risk.py's predict_risk, called once as soon as payload.patient_id
#             is available - before score_admission runs, so the id is
#             recorded even when scoring then rejects the request as out of
#             the caller's scope (A6: the attempted patient must be named on
#             a denial, not only on a success).
# BENEFIT   : the audit entry for the platform's most sensitive route names
#             which patient was scored (or attempted), matching every other
#             guarded endpoint instead of being the one exception.
# COST      : couples this module to fastapi.Request and to the guards
#             stashing the entry on request.state under a fixed attribute
#             name (`audit_entry`) - a typo in either place fails silently
#             (getattr default), not loudly, because a request whose guard
#             was never reached (an unauthenticated 401) legitimately has no
#             entry to attach to.
# ALTERNATIVES : (1) re-read/parse the request body inside the guard itself;
#             (2) have score_admission take and use a request-scoped audit
#             callback directly, coupling app.services.risk_service to the
#             audit subsystem.
# CHOSEN BECAUSE : (1) is what A8 explicitly rules out - the guard already
#             runs before body parsing, and duplicating that parse just for
#             logging adds a second source of truth for the same payload;
#             (2) would pull app.api.deps's concerns into a service module
#             that has no other reason to know about HTTP requests. Passing
#             the value up through request.state - the mechanism FastAPI
#             itself provides for exactly this "guard leaves something for
#             the endpoint" case - keeps risk_service.py untouched (C10).
def attach_resource(request: Request, resource_id: str) -> None:
    """Attach a more specific resource id to this request's audit entry, if any."""
    entry: AuditLog | None = getattr(request.state, "audit_entry", None)
    if entry is not None:
        entry.resource_id = resource_id
