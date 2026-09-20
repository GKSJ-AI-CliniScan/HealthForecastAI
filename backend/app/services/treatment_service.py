"""Treatment effectiveness business logic."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services.analytics_service import (
    get_medication_outcomes,
    get_recovery_trends,
    get_treatment_effectiveness,
)


def list_treatment_effectiveness(
    db: Session,
) -> list[dict[str, Any]]:
    """Return treatment effectiveness summaries."""

    return get_treatment_effectiveness(db)


def get_treatment_recovery_trends(
    db: Session,
) -> list[dict[str, Any]]:
    """Return weekly recovery trends."""

    return get_recovery_trends(db)


def list_medication_outcomes(
    db: Session,
) -> list[dict[str, Any]]:
    """Return medication-change outcome summaries."""

    return get_medication_outcomes(db)
