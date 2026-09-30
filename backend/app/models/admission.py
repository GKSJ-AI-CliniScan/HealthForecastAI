"""Hospital admission ORM model."""

from datetime import date

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Admission(Base):
    """A single inpatient encounter used as the unit of readmission prediction."""

    __tablename__ = "admissions"
    __table_args__ = (
        CheckConstraint(
            "discharge_date IS NULL OR admission_date IS NULL OR discharge_date >= admission_date",
            name="admissions_date_order_check",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)

    # The dataset's own encounter id. It is the only ordering the source data
    # carries - there are no calendar dates - so trend monitoring uses it as a
    # sequence axis and labels it as such.
    source_encounter_id: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, index=True, nullable=True
    )

    admission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    discharge_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    time_in_hospital: Mapped[int | None] = mapped_column(Integer, nullable=True)
    admission_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    admission_source: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # The admitting physician's specialty, used as the "department" for
    # performance monitoring. About half of encounters do not record one; those
    # are NULL and reported as "Not recorded" rather than guessed at.
    department: Mapped[str | None] = mapped_column(String(128), nullable=True)
    discharge_disposition: Mapped[str | None] = mapped_column(String(128), nullable=True)
    num_medications: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_lab_procedures: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_diagnoses: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Prior utilisation in the year before this admission. Used as an adjustment
    # variable in treatment effectiveness: sicker patients get more intensive
    # treatment, and comparing crude rates would mistake that for a drug effect.
    number_inpatient: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_emergency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_outpatient: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Diabetes care indicators. NULL means the test was not performed, which is
    # itself informative and is analysed as such.
    a1c_result: Mapped[str | None] = mapped_column(String(16), nullable=True)
    max_glu_serum: Mapped[str | None] = mapped_column(String(16), nullable=True)
    diabetes_med: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    medication_changed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    readmitted: Mapped[str | None] = mapped_column(String(8), nullable=True)
