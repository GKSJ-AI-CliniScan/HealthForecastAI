"""Data access for generated report metadata."""

from datetime import datetime

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.report import Report
from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[Report]):
    """Report history queries. ``owner_id=None`` means "every user's reports"."""

    def __init__(self, db: Session) -> None:
        super().__init__(Report, db)

    @staticmethod
    def _filtered(owner_id: int | None, report_type: str | None) -> Select[tuple[Report]]:
        stmt = select(Report)
        if owner_id is not None:
            stmt = stmt.where(Report.generated_by == owner_id)
        if report_type is not None:
            stmt = stmt.where(Report.report_type == report_type)
        return stmt

    def list_reports(
        self,
        owner_id: int | None,
        report_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Report]:
        """Newest first."""
        stmt = (
            self._filtered(owner_id, report_type)
            .order_by(Report.generated_at.desc(), Report.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())

    def count_reports(self, owner_id: int | None, report_type: str | None = None) -> int:
        inner = self._filtered(owner_id, report_type).subquery()
        return self.db.execute(select(func.count()).select_from(inner)).scalar_one()

    def generated_before(self, cutoff: datetime) -> list[Report]:
        """Every report generated strictly before ``cutoff`` - the retention purge set."""
        stmt = select(Report).where(Report.generated_at < cutoff).order_by(Report.id)
        return list(self.db.execute(stmt).scalars().all())
