"""User ORM model."""

import uuid
from datetime import UTC, datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID


class User(Base):
    """User account model supporting Role-Based Access Control."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    role_rel: Mapped["Role"] = relationship("Role", back_populates="users")  # type: ignore[name-defined]
    doctor_assignments: Mapped[list["DoctorPatientAssignment"]] = relationship(  # type: ignore[name-defined]
        "DoctorPatientAssignment",
        back_populates="doctor",
        cascade="all, delete-orphan",
        foreign_keys="DoctorPatientAssignment.doctor_id",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(  # type: ignore[name-defined]
        "AuditLog", back_populates="user"
    )

    @property
    def role(self) -> str:
        """Helper property to access role name directly."""
        return self.role_rel.name if self.role_rel else ""

    @property
    def full_name(self) -> str:
        """Helper property for user's full name."""
        return f"{self.first_name} {self.last_name}".strip()
