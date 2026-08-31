"""Risk prediction ORM model."""

from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, String, desc, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RiskPrediction(Base):
    """A stored model output for one admission."""

    __tablename__ = "risk_predictions"
    __table_args__ = (
        CheckConstraint(
            "readmission_probability >= 0 AND readmission_probability <= 1",
            name="risk_probability_range_check",
        ),
        CheckConstraint(
            "risk_category IN ('low', 'medium', 'high')",
            name="risk_category_check",
        ),
        Index("idx_risk_patient_created", "patient_id", desc("created_at")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    admission_id: Mapped[int | None] = mapped_column(
        ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True
    )
    readmission_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_category: Mapped[str] = mapped_column(String(16), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
