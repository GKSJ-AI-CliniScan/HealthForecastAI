"""Validated query-parameter dependencies shared by the analytics routers.

Cross-field checks raise RequestValidationError so a bad filter produces the
exact 422 body FastAPI emits for any other invalid query parameter.
"""

from datetime import date

from fastapi import Query
from fastapi.exceptions import RequestValidationError

from app.schemas.analytics import DateRange, ResearchCohortFilter


def _check_order(date_from: date | None, date_to: date | None) -> None:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise RequestValidationError(
            [
                {
                    "type": "value_error",
                    "loc": ("query", "date_from"),
                    "msg": "date_from must be on or before date_to",
                    "input": date_from.isoformat(),
                }
            ]
        )


def date_range(
    date_from: date | None = Query(default=None, description="Earliest admission date"),
    date_to: date | None = Query(default=None, description="Latest admission date"),
) -> DateRange:
    """Inclusive admission-date window."""
    _check_order(date_from, date_to)
    return DateRange(date_from=date_from, date_to=date_to)


def research_cohort_filter(
    diagnosis: str | None = Query(
        default=None, min_length=1, max_length=255, description="Exact primary diagnosis"
    ),
    gender: str | None = Query(default=None, min_length=1, max_length=16),
    age_band: str | None = Query(
        default=None,
        min_length=1,
        max_length=16,
        description="Generalised age band as shown in the export, e.g. 60-69",
    ),
    date_from: date | None = Query(default=None, description="Admitted on or after"),
    date_to: date | None = Query(default=None, description="Admitted on or before"),
) -> ResearchCohortFilter:
    """Cohort filters for anonymised research reads and exports."""
    _check_order(date_from, date_to)
    return ResearchCohortFilter(
        diagnosis=diagnosis,
        gender=gender,
        age_band=age_band,
        date_from=date_from,
        date_to=date_to,
    )
