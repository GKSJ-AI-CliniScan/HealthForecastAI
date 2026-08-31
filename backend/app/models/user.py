"""User ORM model."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, String, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.rbac import Role
from app.db.base import Base

_ROLE_VALUES = ", ".join(f"'{role}'" for role in Role)


class User(Base):
    """A platform user: doctor, hospital admin, researcher or system admin."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"role IN ({_ROLE_VALUES})", name="users_role_check"),
        Index("idx_users_role", "role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(32), default=Role.DOCTOR, server_default=str(Role.DOCTOR), nullable=False
    )
    department: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
