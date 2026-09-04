"""Audit log ORM model - every privileged action must be recorded."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# WHAT      : split the single free-text "resource" column into a typed
#             (resource_type, resource_id) pair, and index the columns a
#             compliance query actually filters on.
# WHY       : "who accessed patient 42?" needs to filter on an id
#             specifically; a free-text blob that might read "patient 42" or
#             "Patient(id=42)" depending on the caller cannot be queried
#             reliably, only grepped.
# FOR WHOM  : the audit_log:read permission already declared in
#             app/core/rbac.py (Permission.AUDIT_LOG_READ), and any future
#             export for a hospital's compliance/HIPAA audit request.
# BENEFIT   : "WHERE resource_type = 'patient' AND resource_id = '42'"
#             answers the question directly instead of requiring a LIKE scan.
# COST      : two nullable String columns instead of one, and every call
#             site must remember to populate both; a caller that only fills
#             one still passes (neither is NOT NULL) and produces a
#             half-answer entry.
# ALTERNATIVES : (1) keep the single free-text "resource" column and parse
#             it at query time; (2) a JSON column holding an arbitrary
#             resource dict.
# CHOSEN BECAUSE : the resources this project actually audits - patients
#             (integer id) and, later, model artefacts (version string) -
#             both fit a fixed (type, id) pair; a JSON column would need its
#             own schema discipline this project has nowhere else, and a
#             parsed free-text field breaks the first time an id contains a
#             space.
_RESOURCE_TYPE_LEN = 64
_RESOURCE_ID_LEN = 64


class AuditLog(Base):
    """An immutable record of a security relevant action."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    actor_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    resource_type: Mapped[str | None] = mapped_column(
        String(_RESOURCE_TYPE_LEN), nullable=True, index=True
    )
    resource_id: Mapped[str | None] = mapped_column(
        String(_RESOURCE_ID_LEN), nullable=True, index=True
    )
    outcome: Mapped[str] = mapped_column(String(16), default="success", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
