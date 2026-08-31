"""Admission ORM model."""

import uuid
from datetime import UTC, date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID


class Admission(Base):
    """Patient hospital admission episode."""

    __tablename__ = "admissions"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    admission_date: Mapped[date] = mapped_column(Date, nullable=False)
    discharge_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    admission_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    department: Mapped[str | None] = mapped_column(String(128), nullable=True)
    primary_diagnosis: Mapped[str | None] = mapped_column(String(255), nullable=True)
    length_of_stay: Mapped[int | None] = mapped_column(Integer, nullable=True)
    discharge_disposition: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="admissions")  # type: ignore[name-defined]
