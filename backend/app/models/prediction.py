"""Risk prediction ORM model."""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    desc,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RiskPrediction(Base):
    """A stored model output for one admission - a risk score or a readmission forecast.

    `prediction_type` distinguishes a general patient-risk score from a
    readmission-probability forecast, so both prediction flavours share one
    table, one repository and one history/trend query instead of two
    near-identical ones. `readmission_probability` is the model's output
    probability regardless of prediction_type (the column name predates the
    risk/readmission split and is kept to avoid an unrelated rename).
    """

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
        CheckConstraint(
            "prediction_type IN ('risk', 'readmission')",
            name="risk_predictions_type_check",
        ),
        CheckConstraint(
            "confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)",
            name="risk_predictions_confidence_range_check",
        ),
        CheckConstraint(
            "readmission_window IS NULL OR readmission_window IN ('30_day', '90_day')",
            name="risk_predictions_window_check",
        ),
        CheckConstraint(
            "prediction_type != 'readmission' OR admission_id IS NOT NULL",
            name="risk_predictions_readmission_requires_admission_check",
        ),
        Index("idx_risk_patient_created", "patient_id", desc("created_at")),
        Index("idx_risk_predictions_type", "prediction_type", desc("created_at")),
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
    prediction_type: Mapped[str] = mapped_column(
        String(20), default="risk", server_default="risk", nullable=False
    )
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    readmission_window: Mapped[str | None] = mapped_column(String(10), nullable=True)
    actual_readmitted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    outcome_recorded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
