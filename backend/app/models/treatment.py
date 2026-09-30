"""Treatment outcome ORM model."""

from sqlalchemy import CheckConstraint, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TreatmentOutcome(Base):
    """One medication given during one admission, and how the admission ended.

    One row per (admission, drug) where the drug was prescribed. The dataset's
    "No" entries are not stored: absence of a row is the absence of the drug.
    """

    __tablename__ = "treatment_outcomes"
    __table_args__ = (
        CheckConstraint(
            "dose_change IS NULL OR dose_change IN ('Steady', 'Up', 'Down')",
            name="treatment_dose_change_check",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    admission_id: Mapped[int] = mapped_column(
        ForeignKey("admissions.id"), index=True, nullable=False
    )
    treatment_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)

    # Steady, Up or Down: what happened to the dose during the stay.
    dose_change: Mapped[str | None] = mapped_column(String(16), nullable=True)
    medication_change: Mapped[bool | None] = mapped_column(nullable=True)

    # Reserved for a clinically validated recovery score. The source dataset has
    # none, and inventing one would be fabrication, so it is left NULL. Recovery
    # is reported through the documented proxy in analytics_service instead.
    recovery_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    length_of_stay_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(64), nullable=True)
