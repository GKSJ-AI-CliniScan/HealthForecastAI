"""Pydantic schema for model inference input."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, Field


class ClinicalPredictionInput(BaseModel):
    """Raw clinical input features for generating a single patient prediction."""

    patient_id: uuid.UUID | str
    time_in_hospital: int = Field(default=3, ge=1, le=365)
    num_lab_procedures: int = Field(default=40, ge=0)
    num_procedures: int = Field(default=1, ge=0)
    num_medications: int = Field(default=15, ge=0)
    number_outpatient: int = Field(default=0, ge=0)
    number_emergency: int = Field(default=0, ge=0)
    number_inpatient: int = Field(default=0, ge=0)
    number_diagnoses: int = Field(default=5, ge=1)
    gender: str = Field(default="Female")
    age: str = Field(default="[60-70)")
    race: str = Field(default="Caucasian")
    admission_type_id: int = Field(default=1)
    discharge_disposition_id: int = Field(default=1)
    admission_source_id: int = Field(default=7)
    max_glu_serum: str = Field(default="None")
    A1Cresult: str = Field(default="None")
    metformin: str = Field(default="No")
    glipizide: str = Field(default="No")
    glyburide: str = Field(default="No")
    insulin: str = Field(default="No")
    change: str = Field(default="No")
    diabetesMed: str = Field(default="No")
    diag_1: str = Field(default="428")
    diag_2: str = Field(default="250")
    diag_3: str = Field(default="401")
