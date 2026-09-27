"""Generated report metadata ORM model."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    desc,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

REPORT_TYPES = (
    "treatment_effectiveness",
    "patient_outcomes",
    "department_performance",
    "population_health",
    "risk_distribution",
    "readmission_analytics",
    "research_cohort",
)
REPORT_FORMATS = ("csv", "xlsx", "pdf")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(value) for value in values)})"


class Report(Base):
    """One generated analytics export. The file lives on local report storage;
    ``file_path`` holds only the server-generated file name inside it."""

    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint(_in("report_type", REPORT_TYPES), name="reports_type_check"),
        CheckConstraint(_in("format", REPORT_FORMATS), name="reports_format_check"),
        CheckConstraint("file_size_bytes >= 0", name="reports_file_size_check"),
        Index("idx_reports_generated_by", "generated_by", desc("generated_at")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    format: Mapped[str] = mapped_column(String(10), nullable=False)
    # RESTRICT, per the Database Design doc: a user who generated reports cannot
    # be deleted out from under their report history.
    generated_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    filters: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"), nullable=True
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
