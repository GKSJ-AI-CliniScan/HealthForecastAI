"""Patient Outcome & Recovery ORM model."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base


class PatientOutcome(Base):
    """Patient clinical recovery episode and outcome progression."""

    __tablename__ = "patient_outcomes"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    admission_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    outcome_status: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    outcome_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    patient: Mapped[Patient] = relationship("Patient", back_populates="patient_outcomes")  # type: ignore[name-defined]
    admission: Mapped[Admission | None] = relationship("Admission", back_populates="patient_outcomes")  # type: ignore[name-defined]
