"""Risk prediction ORM model."""

from datetime import UTC, datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, Float, ForeignKey, String, func
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
        CheckConstraint("risk_category IN ('low', 'medium', 'high')", name="risk_category_check"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    admission_id: Mapped[int | None] = mapped_column(ForeignKey("admissions.id"), nullable=True)
    readmission_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_category: Mapped[str] = mapped_column(String(16), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)

    # Why this patient scored what they did: the baseline probability and the
    # factors that raised and lowered it. Computed at scoring time from the full
    # record, so it always describes the same inputs as the score beside it.
    drivers: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
