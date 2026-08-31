"""Patient ORM model."""

import uuid
from datetime import UTC, date, datetime
from sqlalchemy import Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID


class Patient(Base):
    """Patient clinical record model."""

    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    patient_identifier: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    doctor_assignments: Mapped[list["DoctorPatientAssignment"]] = relationship(  # type: ignore[name-defined]
        "DoctorPatientAssignment",
        back_populates="patient",
        cascade="all, delete-orphan",
        foreign_keys="DoctorPatientAssignment.patient_id",
    )
    medical_histories: Mapped[list["MedicalHistory"]] = relationship(  # type: ignore[name-defined]
        "MedicalHistory",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    admissions: Mapped[list["Admission"]] = relationship(  # type: ignore[name-defined]
        "Admission",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    treatments: Mapped[list["Treatment"]] = relationship(  # type: ignore[name-defined]
        "Treatment",
        back_populates="patient",
        cascade="all, delete-orphan",
    )

    @property
    def full_name(self) -> str:
        """Full patient name."""
        return f"{self.first_name} {self.last_name}".strip()
