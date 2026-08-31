"""Treatment outcome ORM model."""

from sqlalchemy import Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TreatmentOutcome(Base):
    """Effectiveness of a treatment or medication regimen for one admission."""

    __tablename__ = "treatment_outcomes"
    __table_args__ = (Index("idx_treatment_admission", "admission_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    admission_id: Mapped[int] = mapped_column(
        ForeignKey("admissions.id", ondelete="CASCADE"), nullable=False
    )
    treatment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    medication_change: Mapped[bool | None] = mapped_column(nullable=True)
    recovery_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    length_of_stay_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(64), nullable=True)
