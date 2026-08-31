"""Role ORM model."""

import uuid
from datetime import UTC, datetime
from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID


class Role(Base):
    """Role model for RBAC."""

    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="role_rel", cascade="all")  # type: ignore[name-defined]
