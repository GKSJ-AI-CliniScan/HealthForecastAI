"""Patient ORM model.

One row per unique patient. The source dataset holds 101,766 encounters from
roughly 71,500 patients, so a flat encounter table would let the same person
appear in both the training and the test split. Splitting patients from
encounters and placing a unique constraint on ``patient_nbr`` moves that
guarantee into the database, where application code cannot forget it.
"""

from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Patient(Base):
    """A de-identified patient sourced from the hospital system."""

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medical_record_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    # The dataset's own patient identifier. Unique by design: this is the
    # constraint that prevents patient-level leakage during model training.
    patient_nbr: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, index=True, nullable=True
    )

    # Demographics are properties of the patient, not of a single visit, so they
    # live here rather than being repeated on every encounter row.
    age_group: Mapped[str | None] = mapped_column(String(16), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    race: Mapped[str | None] = mapped_column(String(64), nullable=True)
    primary_diagnosis: Mapped[str | None] = mapped_column(String(255), nullable=True)

    assigned_doctor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    admissions: Mapped[list["Admission"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    assigned_doctor: Mapped["User | None"] = relationship(  # noqa: F821
        back_populates="assigned_patients"
    )

    def __repr__(self) -> str:
        """Return a short debugging representation without identifying data."""
        return f"<Patient id={self.id} age_group={self.age_group!r}>"


# Kept so that a bare import of this module registers the FK target.
_ = Integer
