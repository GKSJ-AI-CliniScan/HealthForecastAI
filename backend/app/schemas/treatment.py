"""Treatment schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class TreatmentBase(BaseModel):
    """Base clinical treatment fields."""

    treatment_name: str = Field(..., max_length=255)
    treatment_type: str | None = Field(None, max_length=128)
    start_date: date
    end_date: date | None = None
    status: str = Field("ACTIVE", max_length=32)
    outcome: str | None = Field(None, max_length=32)
    effectiveness_score: float | None = Field(None, ge=0.0, le=100.0)
    notes: str | None = None


class TreatmentCreate(TreatmentBase):
    """Payload for creating treatment record."""

    patient_id: uuid.UUID | None = None


class TreatmentUpdate(BaseModel):
    """Payload for updating treatment record."""

    treatment_name: str | None = None
    treatment_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    outcome: str | None = None
    effectiveness_score: float | None = Field(None, ge=0.0, le=100.0)
    notes: str | None = None


class TreatmentResponse(TreatmentBase):
    """Treatment response schema."""

    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientTreatmentItem(BaseModel):
    """Individual treatment item with duration for patient analysis."""

    id: uuid.UUID
    treatment_name: str
    treatment_type: str | None = None
    start_date: date
    end_date: date | None = None
    duration_days: int | None = None
    status: str
    outcome: str | None = None
    effectiveness_score: float | None = None
    notes: str | None = None


class PatientTreatmentSummary(BaseModel):
    """Summary metrics for patient treatments."""

    total_treatments: int
    completed: int
    average_effectiveness: float | None = None


class PatientTreatmentAnalysisResponse(BaseModel):
    """Response schema for GET /api/v1/patients/{patient_id}/treatment-analysis."""

    patient_id: uuid.UUID
    treatments: list[PatientTreatmentItem]
    summary: PatientTreatmentSummary
