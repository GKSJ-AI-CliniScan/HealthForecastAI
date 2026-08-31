"""Audit Log schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    """Audit log entry schema."""

    id: uuid.UUID
    user_id: uuid.UUID | None = None
    username: str | None = None
    action: str
    resource: str | None = None
    resource_id: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    """Paginated audit logs response."""

    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
