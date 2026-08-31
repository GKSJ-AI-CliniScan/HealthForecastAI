"""Audit Service."""

import uuid
from datetime import UTC, datetime
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.repositories.audit_repository import AuditRepository
from app.schemas.audit_log import AuditLogResponse


class AuditService:
    """Service to create and query audit trails."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = AuditRepository(db)

    def log_action(
        self,
        action: str,
        resource: str | None = None,
        resource_id: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> AuditLog:
        """Record an audit log entry."""
        log = AuditLog(
            id=uuid.uuid4(),
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            created_at=datetime.now(UTC),
        )
        return self.repo.create(log)

    def list_logs(self, page: int = 1, page_size: int = 15) -> tuple[list[AuditLogResponse], int]:
        """List audit logs with user info."""
        skip = (page - 1) * page_size
        items, total = self.repo.list_logs(skip=skip, limit=page_size)
        responses = [
            AuditLogResponse(
                id=item.id,
                user_id=item.user_id,
                username=item.user.username if item.user else "System",
                action=item.action,
                resource=item.resource,
                resource_id=item.resource_id,
                created_at=item.created_at,
            )
            for item in items
        ]
        return responses, total
