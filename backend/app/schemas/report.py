"""Reporting schemas."""

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

ReportType = Literal[
    "treatment_effectiveness",
    "patient_outcomes",
    "department_performance",
    "population_health",
    "risk_distribution",
    "readmission_analytics",
    "research_cohort",
]
ReportFormat = Literal["csv", "xlsx", "pdf"]

# Which filters each report type understands. A filter outside this set is
# rejected rather than silently ignored, so a report never claims a filter it
# did not actually apply.
ALLOWED_FILTERS: dict[str, frozenset[str]] = {
    "treatment_effectiveness": frozenset({"treatment_name", "department"}),
    "patient_outcomes": frozenset({"months"}),
    "department_performance": frozenset({"date_from", "date_to"}),
    "population_health": frozenset(),
    "risk_distribution": frozenset({"months"}),
    "readmission_analytics": frozenset({"months"}),
    "research_cohort": frozenset({"diagnosis", "gender", "age_band", "date_from", "date_to"}),
}


class ReportFilters(BaseModel):
    """Every filter any report type accepts; ALLOWED_FILTERS narrows per type."""

    model_config = ConfigDict(extra="forbid")

    date_from: date | None = None
    date_to: date | None = None
    months: int | None = Field(default=None, ge=1, le=60)
    treatment_name: str | None = Field(default=None, min_length=1, max_length=255)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    diagnosis: str | None = Field(default=None, min_length=1, max_length=255)
    gender: str | None = Field(default=None, min_length=1, max_length=16)
    age_band: str | None = Field(default=None, min_length=1, max_length=16)

    @model_validator(mode="after")
    def _date_order(self) -> "ReportFilters":
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from must be on or before date_to")
        return self


class ReportGenerateRequest(BaseModel):
    """Body of POST /reports/generate."""

    model_config = ConfigDict(extra="forbid")

    report_type: ReportType
    format: ReportFormat
    filters: ReportFilters = Field(default_factory=ReportFilters)

    @model_validator(mode="after")
    def _filters_apply_to_type(self) -> "ReportGenerateRequest":
        supplied = set(self.filters.model_dump(exclude_none=True))
        unsupported = supplied - ALLOWED_FILTERS[self.report_type]
        if unsupported:
            raise ValueError(
                f"Filter(s) {', '.join(sorted(unsupported))} not supported for "
                f"report_type '{self.report_type}'"
            )
        return self


class ReportRead(BaseModel):
    """A generated report's metadata."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    report_type: ReportType
    format: ReportFormat
    generated_by: int
    generated_at: datetime
    filters: dict[str, Any] = Field(default_factory=dict)
    file_size_bytes: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def download_url(self) -> str:
        return f"/api/v1/reports/{self.id}/download"


class ReportPurgeResult(BaseModel):
    """Outcome of a retention purge."""

    deleted: int
    older_than_days: int
