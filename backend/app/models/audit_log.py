"""Audit log ORM model - every privileged action must be recorded."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, Index, Integer, String, desc, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    """An immutable record of a security relevant action."""

    __tablename__ = "audit_logs"
    # actor_id deliberately carries no foreign key: an audit row must outlive the
    # account that produced it.
    __table_args__ = (Index("idx_audit_actor_created", "actor_id", desc("created_at")),)

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource: Mapped[str | None] = mapped_column(String(128), nullable=True)
    outcome: Mapped[str] = mapped_column(
        String(16), default="success", server_default="success", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
