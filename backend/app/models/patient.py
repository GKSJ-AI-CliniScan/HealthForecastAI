"""Patient ORM model."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Patient(Base):
    """A de-identified patient record sourced from the hospital system."""

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medical_record_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    age_group: Mapped[str | None] = mapped_column(String(16), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    race: Mapped[str | None] = mapped_column(String(64), nullable=True)
    primary_diagnosis: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assigned_doctor_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
