"""Risk prediction and readmission forecasting schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RiskPredictionRequest(BaseModel):
    """Feature payload submitted for a single readmission risk prediction.

    Field names match the dataset columns the model was fitted on, so they map
    straight onto the feature frame. Anything omitted is imputed from the
    training distribution and the response reports the coverage.
    """

    patient_id: int
    persist: bool = Field(default=False, description="Store the result against the patient")

    time_in_hospital: int | None = Field(default=None, ge=0, le=365)
    num_medications: int | None = Field(default=None, ge=0)
    num_lab_procedures: int | None = Field(default=None, ge=0)
    num_procedures: int | None = Field(default=None, ge=0)
    number_diagnoses: int | None = Field(default=None, ge=0)
    number_inpatient: int | None = Field(default=None, ge=0)
    number_emergency: int | None = Field(default=None, ge=0)
    number_outpatient: int | None = Field(default=None, ge=0)
    age_group: str | None = None
    gender: str | None = None
    race: str | None = None
    admission_type: str | None = None
    discharge_disposition: str | None = None
    admission_source: str | None = None
    diag_1_group: str | None = None
    change: str | None = None
    diabetesMed: str | None = None  # noqa: N815 - matches the dataset column name
    insulin: str | None = None


class RiskPredictionRead(BaseModel):
    """A readmission risk result."""

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    patient_id: int
    readmission_probability: float = Field(ge=0.0, le=1.0)
    risk_category: str
    flagged: bool = Field(default=False, description="Above the model's tuned decision threshold")
    decision_threshold: float = 0.5
    model_name: str
    model_version: str
    features_supplied: int | None = None
    features_expected: int | None = None
    created_at: datetime | None = None


class RiskDriver(BaseModel):
    """One feature the model leans on, for the clinical insights module."""

    feature: str
    weight: float
    direction: str


class ScoredPatient(BaseModel):
    """A patient with their current risk score attached."""

    model_config = ConfigDict(protected_namespaces=())

    patient_id: int
    medical_record_number: str
    age_group: str | None = None
    gender: str | None = None
    primary_diagnosis: str | None = None
    readmission_probability: float
    risk_category: str
    model_version: str


class ScoredPatientPage(BaseModel):
    """A page of scored patients."""

    items: list[ScoredPatient]
    total: int
    limit: int
    offset: int


class RiskDistribution(BaseModel):
    """Count of patients per risk band."""

    low: int = 0
    medium: int = 0
    high: int = 0


class ReadmissionForecast(BaseModel):
    """Aggregated readmission forecast for a caseload or the hospital."""

    model_config = ConfigDict(protected_namespaces=())

    scope: str
    horizon_days: int
    patients_scored: int
    expected_readmissions: float
    expected_rate: float = Field(ge=0.0, le=1.0)
    risk_distribution: RiskDistribution
    model_version: str | None = None
    basis: str
