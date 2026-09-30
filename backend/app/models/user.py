"""User ORM model."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.rbac import Role
from app.db.base import Base


class User(Base):
    """A platform user: doctor, hospital admin, researcher or system admin."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('doctor', 'hospital_admin', 'researcher', 'system_admin')",
            name="users_role_check",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(32), default=Role.DOCTOR, server_default="doctor", nullable=False
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
