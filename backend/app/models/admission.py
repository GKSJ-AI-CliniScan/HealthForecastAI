"""Hospital admission ORM model."""

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Admission(Base):
    """A single inpatient encounter used as the unit of readmission prediction."""

    __tablename__ = "admissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id"), index=True, nullable=False
    )
    admission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    discharge_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    time_in_hospital: Mapped[int | None] = mapped_column(Integer, nullable=True)
    admission_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    discharge_disposition: Mapped[str | None] = mapped_column(
        String(128), nullable=True
    )
    num_medications: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_lab_procedures: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_diagnoses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    readmitted: Mapped[str | None] = mapped_column(String(8), nullable=True)
