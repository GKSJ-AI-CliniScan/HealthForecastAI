"""Hospital admission ORM model.

The encounter is the unit of readmission prediction. The three-class
``readmitted`` value from the source data is preserved so nothing is lost, and
the binary 30-day target is stored alongside it as a derived column.
"""

from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Discharge dispositions recording death or hospice transfer. Encounters with
# these values cannot be followed by a readmission and are excluded from any
# training set - see ml/src/data/preprocess.py.
NON_READMITTABLE_DISPOSITIONS = (11, 13, 14, 19, 20, 21)


class Admission(Base):
    """A single inpatient encounter."""

    __tablename__ = "admissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)

    # The dataset's own encounter identifier, kept so a row can be traced back
    # to the source CSV during review.
    encounter_id: Mapped[int | None] = mapped_column(
        Integer, unique=True, index=True, nullable=True
    )

    admission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    discharge_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    time_in_hospital: Mapped[int | None] = mapped_column(Integer, nullable=True)

    admission_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    discharge_disposition: Mapped[str | None] = mapped_column(String(128), nullable=True)
    discharge_disposition_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    admission_source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    medical_specialty: Mapped[str | None] = mapped_column(String(128), nullable=True)

    num_medications: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_lab_procedures: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_procedures: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_diagnoses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_outpatient: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_emergency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_inpatient: Mapped[int | None] = mapped_column(Integer, nullable=True)

    diag_1: Mapped[str | None] = mapped_column(String(16), nullable=True)
    diag_2: Mapped[str | None] = mapped_column(String(16), nullable=True)
    diag_3: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # Original three-class label: "<30", ">30" or "NO".
    readmitted: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # Derived target for Milestone 2. Both ">30" and "NO" are negatives.
    readmitted_within_30: Mapped[bool | None] = mapped_column(Boolean, index=True, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="admissions")  # noqa: F821

    @staticmethod
    def derive_readmitted_within_30(readmitted: str | None) -> bool | None:
        """Convert the three-class label into the 30-day binary target."""
        if readmitted is None:
            return None
        return readmitted.strip() == "<30"

    def __repr__(self) -> str:
        """Return a short debugging representation."""
        return f"<Admission id={self.id} patient_id={self.patient_id}>"
