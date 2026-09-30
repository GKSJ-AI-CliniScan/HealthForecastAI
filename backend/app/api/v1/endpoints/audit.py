"""Audit trail endpoint - Milestone 4 (System Administrator only)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services import auth_service

router = APIRouter()

CanReadAudit = Annotated[User, Depends(require_permission(Permission.AUDIT_LOG_READ))]
DbSession = Annotated[Session, Depends(get_db)]


class AuditEntry(BaseModel):
    """One row of the audit trail."""

    id: int
    created_at: str
    actor_id: int | None
    actor_role: str | None
    action: str
    resource: str | None
    outcome: str


class AuditPage(BaseModel):
    """A page of the audit trail, newest first."""

    total: int
    limit: int
    offset: int
    items: list[AuditEntry]


@router.get("", response_model=AuditPage, summary="Read the audit trail")
def read_audit_log(
    actor: CanReadAudit,
    db: DbSession,
    action: str | None = Query(default=None, description="Exact action, e.g. patient.read"),
    actor_id: int | None = None,
    outcome: str | None = Query(default=None, description="success, failure, inactive"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> AuditPage:
    """Return the audit trail, newest first.

    Reading the trail is itself recorded, so an administrator's own browsing of it
    is accountable. Entries are append-only: there is no endpoint to change or
    delete one.
    """
    conditions = []
    if action:
        conditions.append(AuditLog.action == action)
    if actor_id is not None:
        conditions.append(AuditLog.actor_id == actor_id)
    if outcome:
        conditions.append(AuditLog.outcome == outcome)

    total = db.execute(select(func.count()).select_from(AuditLog).where(*conditions)).scalar_one()
    rows = db.execute(
        select(AuditLog)
        .where(*conditions)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(limit)
        .offset(offset)
    ).scalars()
    items = [
        AuditEntry(
            id=row.id,
            created_at=row.created_at.isoformat(),
            actor_id=row.actor_id,
            actor_role=row.actor_role,
            action=row.action,
            resource=row.resource,
            outcome=row.outcome,
        )
        for row in rows
    ]

    # Recorded after the read so the entry does not appear in its own result.
    auth_service.audit_read(db, actor, "audit.read", f"returned:{len(items)}")
    return AuditPage(total=total, limit=limit, offset=offset, items=items)
