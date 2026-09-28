"""Treatment outcome model - Module 4."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TreatmentOutcome(Base):
    """Records how a specific treatment/admission resolved."""

    __tablename__ = "treatment_outcomes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    admission_id: Mapped[int | None] = mapped_column(ForeignKey("admissions.id"), nullable=True)
    treatment_type: Mapped[str] = mapped_column(String(100))
    outcome_status: Mapped[str] = mapped_column(String(50))  # improved / unchanged / worsened
    recovery_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    effectiveness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)