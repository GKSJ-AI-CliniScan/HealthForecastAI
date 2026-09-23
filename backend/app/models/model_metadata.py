"""ML model registry ORM model."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ModelMetadata(Base):
    """A single trained/deployed ML model artefact and its evaluation metrics.

    One row per training run. `status` tracks the staged -> production -> retired
    lifecycle; `predictions.model_version` (a soft reference, not a foreign key) is
    what actually ties a served prediction back to the row that produced it, so a
    model can be retired without invalidating historical prediction rows.
    """

    __tablename__ = "model_metadata"
    __table_args__ = (
        CheckConstraint(
            "algorithm IN ('xgboost', 'random_forest', 'logistic_regression')",
            name="model_metadata_algorithm_check",
        ),
        CheckConstraint(
            "status IN ('staged', 'production', 'retired', 'rejected')",
            name="model_metadata_status_check",
        ),
        CheckConstraint(
            "accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 1)",
            name="model_metadata_accuracy_range_check",
        ),
        CheckConstraint(
            "precision_score IS NULL OR (precision_score >= 0 AND precision_score <= 1)",
            name="model_metadata_precision_range_check",
        ),
        CheckConstraint(
            "recall IS NULL OR (recall >= 0 AND recall <= 1)",
            name="model_metadata_recall_range_check",
        ),
        CheckConstraint(
            "f1_score IS NULL OR (f1_score >= 0 AND f1_score <= 1)",
            name="model_metadata_f1_range_check",
        ),
        CheckConstraint(
            "roc_auc IS NULL OR (roc_auc >= 0 AND roc_auc <= 1)",
            name="model_metadata_roc_auc_range_check",
        ),
        UniqueConstraint("model_name", "version", name="uq_model_metadata_name_version"),
        Index("idx_model_metadata_status", "model_name", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    algorithm: Mapped[str] = mapped_column(String(50), nullable=False)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    precision_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall: Mapped[float | None] = mapped_column(Float, nullable=True)
    f1_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    roc_auc: Mapped[float | None] = mapped_column(Float, nullable=True)
    artifact_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="staged", nullable=False)
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    promoted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    promoted_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
