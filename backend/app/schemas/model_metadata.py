"""ML model registry schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ModelMetadataCreate(BaseModel):
    """Payload the training pipeline submits when it registers a new artefact."""

    model_name: str
    version: str
    algorithm: str
    accuracy: float | None = Field(default=None, ge=0.0, le=1.0)
    precision_score: float | None = Field(default=None, ge=0.0, le=1.0)
    recall: float | None = Field(default=None, ge=0.0, le=1.0)
    f1_score: float | None = Field(default=None, ge=0.0, le=1.0)
    roc_auc: float | None = Field(default=None, ge=0.0, le=1.0)
    artifact_path: str
    trained_at: datetime


class ModelMetadataRead(BaseModel):
    """A registered model version, as returned by the model management endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    model_name: str
    version: str
    algorithm: str
    accuracy: float | None = None
    precision_score: float | None = None
    recall: float | None = None
    f1_score: float | None = None
    roc_auc: float | None = None
    artifact_path: str
    status: str
    trained_at: datetime
    promoted_at: datetime | None = None
    promoted_by: int | None = None
