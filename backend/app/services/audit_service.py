"""Compliance audit trail: record who did what, to what, and whether they
were allowed to.

Called from the RBAC guards in app.api.deps, once per request, before the
endpoint body runs - so it covers every risk and patient-access endpoint
without each one having to remember to log itself.
"""

from __future__ import annotations

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
