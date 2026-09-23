"""Clinical Decision Support schemas."""

from pydantic import BaseModel


class RecommendationItem(BaseModel):
    """One deterministic, rule-based suggestion."""

    category: str
    text: str


class CareRecommendationsRead(BaseModel):
    """Care and follow-up recommendations for a patient."""

    patient_id: int
    risk_category: str | None = None
    based_on_prediction_id: int | None = None
    recommendations: list[RecommendationItem]
    follow_up_days: int | None = None


class DischargePlanRead(BaseModel):
    """Discharge readiness assessment and mitigation steps for a patient."""

    patient_id: int
    risk_category: str | None = None
    based_on_prediction_id: int | None = None
    risk_mitigation: list[RecommendationItem]
    discharge_checklist: list[RecommendationItem]
    ready_for_discharge: bool | None = None
