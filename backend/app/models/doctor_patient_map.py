"""Doctor to patient scope mapping.

Implements the "assigned patients only" restriction the project brief places on the
Doctor role. A doctor may be scoped to many patients and a patient may be co-managed
by several doctors, so the relationship is resolved through this join table rather
than through patients.assigned_doctor_id alone.
"""

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DoctorPatientMap(Base):
    """One granted scope assignment between a doctor and a patient."""

    __tablename__ = "doctor_patient_map"
    __table_args__ = (
        UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient"),
        Index("idx_dpm_doctor", "doctor_id"),
        Index("idx_dpm_patient", "patient_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
    # The administrator who granted the assignment. Kept for the audit trail; the
    # mapping survives that administrator's account being removed.
    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
