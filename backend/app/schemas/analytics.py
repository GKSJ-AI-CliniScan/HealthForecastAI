"""Analytics and reporting schemas."""

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    """Serialises snake_case fields as camelCase, which is what the dashboards read."""

    model_config = ConfigDict(populate_by_name=True)


class RiskDistribution(BaseModel):
    """Count of patients per risk band."""

    low: int = 0
    medium: int = 0
    high: int = 0


class HospitalAnalyticsSummary(BaseModel):
    """Top level KPIs for the hospital administrator dashboard."""

    total_patients: int = 0
    total_admissions: int = 0
    readmission_rate: float = 0.0
    average_length_of_stay: float = 0.0
    risk_distribution: RiskDistribution = RiskDistribution()


class TreatmentEffectivenessSummary(BaseModel):
    """Effectiveness rollup for one treatment."""

    treatment_name: str
    patients_treated: int = 0
    average_recovery_score: float = 0.0
    readmission_rate: float = 0.0


class MedicationOutcome(CamelModel):
    """One row of the protocol efficacy matrix."""

    treatment: str
    success_rate: float = Field(0.0, serialization_alias="successRate")
    side_effects_rate: float = Field(0.0, serialization_alias="sideEffectsRate")
    patients_treated: int = Field(0, serialization_alias="patientsTreated")
    average_recovery_score: float = Field(0.0, serialization_alias="averageRecoveryScore")
    readmission_rate: float = Field(0.0, serialization_alias="readmissionRate")


class RecoveryTrendPoint(CamelModel):
    """Mean recovery index for one day of stay, split by specialty cohort."""

    day: str
    cardiac: float | None = None
    renal: float | None = None
    pulmonary: float | None = None


class TreatmentSummary(CamelModel):
    """Composite payload for the treatment effectiveness dashboard."""

    success_rate: float = Field(0.0, serialization_alias="successRate")
    recovery_rate: float = Field(0.0, serialization_alias="recoveryRate")
    complications_rate: float = Field(0.0, serialization_alias="complicationsRate")
    outcomes_recorded: int = Field(0, serialization_alias="outcomesRecorded")
    protocols_evaluated: int = Field(0, serialization_alias="protocolsEvaluated")
    disease_group: str = Field("All", serialization_alias="diseaseGroup")
    medications_data: list[MedicationOutcome] = Field(
        default_factory=list, serialization_alias="medicationsData"
    )
    recovery_progress_trend: list[RecoveryTrendPoint] = Field(
        default_factory=list, serialization_alias="recoveryProgressTrend"
    )
