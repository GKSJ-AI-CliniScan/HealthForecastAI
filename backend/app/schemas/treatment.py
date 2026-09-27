"""Treatment effectiveness schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

OutcomeLiteral = Literal["improved", "unchanged", "worsened", "unknown"]


class TreatmentOutcomeCreate(BaseModel):
    """Payload for recording a treatment outcome against an admission."""

    treatment_name: str = Field(min_length=1, max_length=255)
    medication_change: bool | None = None
    recovery_score: float | None = None
    length_of_stay_days: int | None = Field(default=None, ge=0)
    outcome: OutcomeLiteral | None = None


class TreatmentOutcomeRead(BaseModel):
    """A recorded treatment outcome."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    admission_id: int
    treatment_name: str
    medication_change: bool | None = None
    recovery_score: float | None = None
    length_of_stay_days: int | None = None
    outcome: OutcomeLiteral | None = None


class TreatmentRateSummary(BaseModel):
    """Recovery/success rollup for one treatment (GET /treatment)."""

    treatment_name: str
    sample_size: int
    average_recovery_score: float | None = None
    success_rate: float = Field(ge=0.0, le=1.0)


class TreatmentComparison(BaseModel):
    """One treatment's figures within a single diagnosis cohort."""

    treatment_name: str
    sample_size: int
    average_recovery_score: float | None = None
    success_rate: float = Field(ge=0.0, le=1.0)
    readmission_rate: float = Field(ge=0.0, le=1.0)


class RecoveryTrendPoint(BaseModel):
    """One week's recovery-score trend point."""

    week_start: str
    average_recovery_score: float | None = None
    sample_size: int


class TreatmentOutcomeDistribution(BaseModel):
    """Outcome counts for one treatment - the outcome-vs-treatment cross-tab
    of FR-ANL-02. "unrecorded" counts rows whose outcome is NULL."""

    treatment_name: str
    sample_size: int
    outcomes: dict[str, int]


class DepartmentEffectiveness(BaseModel):
    """Treatment effectiveness figures for one hospital department."""

    department: str
    sample_size: int
    average_recovery_score: float | None = None
    success_rate: float = Field(ge=0.0, le=1.0)
    readmission_rate: float = Field(ge=0.0, le=1.0)


class ReadmissionReduction(BaseModel):
    """Readmission rate for one treatment vs. the hospital-wide baseline."""

    treatment_name: str
    treatment_readmission_rate: float = Field(ge=0.0, le=1.0)
    hospital_baseline_readmission_rate: float = Field(ge=0.0, le=1.0)
    sample_size: int
