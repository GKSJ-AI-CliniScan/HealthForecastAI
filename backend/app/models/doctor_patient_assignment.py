"""Doctor Patient Assignment ORM model."""

import uuid
from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID


class DoctorPatientAssignment(Base):
    """Mapping between doctors (users) and assigned patients."""

    __tablename__ = "doctor_patient_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(), primary_key=True, default=uuid.uuid4, index=True
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient_assignment"),
    )

    # Relationships
    doctor: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="doctor_assignments", foreign_keys=[doctor_id]
    )
    patient: Mapped["Patient"] = relationship(  # type: ignore[name-defined]
        "Patient", back_populates="doctor_assignments", foreign_keys=[patient_id]
    )
