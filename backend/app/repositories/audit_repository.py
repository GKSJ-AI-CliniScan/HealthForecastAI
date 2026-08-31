"""Audit Log Repository."""

import uuid
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models.audit_log import AuditLog
from app.repositories.base_repository import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    """Data access methods for Audit Logs."""

    def __init__(self, db: Session):
        super().__init__(AuditLog, db)

    def list_logs(self, skip: int = 0, limit: int = 15) -> tuple[list[AuditLog], int]:
        """List audit logs in reverse chronological order with user preloaded."""
        query = self.db.query(AuditLog).options(joinedload(AuditLog.user))
        total = self.db.query(func.count(AuditLog.id)).scalar() or 0
        items = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
        return items, total
