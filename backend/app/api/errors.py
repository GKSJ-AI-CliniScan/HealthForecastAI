"""HTTP error builders shared by more than one router."""

from fastapi import HTTPException, status

from app.services.patient_service import CohortTooSmallError


def cohort_too_small(exc: CohortTooSmallError) -> HTTPException:
    """422 for any re-identification / small-sample guard, one body shape everywhere."""
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={"error": "cohort_too_small", "minimum": exc.minimum, "actual": exc.size},
    )
