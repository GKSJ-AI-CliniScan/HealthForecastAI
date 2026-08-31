"""Patient ORM model."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Patient(Base):
    """A de-identified patient record sourced from the hospital system."""

    __tablename__ = "patients"
    __table_args__ = (Index("idx_patients_assigned_doctor", "assigned_doctor_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    medical_record_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    age_group: Mapped[str | None] = mapped_column(String(16), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    race: Mapped[str | None] = mapped_column(String(64), nullable=True)
    primary_diagnosis: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # The primary attending doctor. Wider co-management is expressed through
    # doctor_patient_map; both are honoured when scoping a doctor's access.
    assigned_doctor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
