"""Append-only writes to the audit trail."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    """Records privileged actions.

    audit_logs is append only: this repository never exposes update or delete,
    and callers must not reach past it to the inherited helpers.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(AuditLog, db)

    def record(
        self,
        action: str,
        actor_id: int | None = None,
        actor_role: str | None = None,
        resource: str | None = None,
        outcome: str = "success",
    ) -> AuditLog:
        """Write one audit entry.

        A failed action is still recorded, so ``outcome`` carries "failure" rather
        than the caller skipping the write.
        """
        return self.create(
            action=action,
            actor_id=actor_id,
            actor_role=actor_role,
            resource=resource,
            outcome=outcome,
        )

    def list_recent(self, limit: int = 100, offset: int = 0) -> list[AuditLog]:
        """Return the newest audit entries first."""
        stmt = (
            select(AuditLog)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_for_actor(self, actor_id: int, limit: int = 100) -> list[AuditLog]:
        """Return one actor's audit entries, newest first."""
        stmt = (
            select(AuditLog)
            .where(AuditLog.actor_id == actor_id)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
