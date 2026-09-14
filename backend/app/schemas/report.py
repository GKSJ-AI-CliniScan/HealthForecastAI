"""Forecasting and risk report schemas - Milestone 2, FR-RPT-02 / FR-RPT-03.

A report is a read-only composition over data the platform already holds:
stored risk predictions, admission history and the readmission forecast. These
schemas describe that composition; nothing here computes anything.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.analytics import RiskDistribution

REPORT_VERSION = "1.0.0"


class ReportMetadata(BaseModel):
    """Provenance for one generated report.

    ``scope`` records what the caller was actually allowed to see, so a report
    read later cannot be mistaken for a wider view than it was. SRS 10.2 asks a
    report to carry a data-availability notice when the period is thin; that is
    what ``notes`` carries.
    """

    generated_at: datetime
    generated_for_role: str
    scope: str
    report_version: str = REPORT_VERSION
    notes: list[str] = Field(default_factory=list)


class RiskFactor(BaseModel):
    """One plain-language driver behind a patient's risk band."""

    factor: str
    detail: str


class PatientRiskReport(BaseModel):
    """Per-patient readmission risk report - FR-RPT-03.

    Combines the patient's latest stored prediction with the admission history
    the prediction was made against, so a clinician sees the score and the
    evidence in one response rather than three.
    """

    model_config = ConfigDict(from_attributes=True)

    metadata: ReportMetadata

    patient_id: int
    medical_record_number: str
    age_group: str | None = None
    gender: str | None = None
    primary_diagnosis: str | None = None
    assigned_doctor_id: int | None = None

    # Latest stored prediction. All None when the patient has never been scored.
    readmission_probability: float | None = Field(default=None, ge=0.0, le=1.0)
    risk_category: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    scored_at: datetime | None = None

    # Admission history behind the score.
    total_admissions: int = 0
    readmitted_total: int = 0
    readmissions_by_label: dict[str, int] = Field(default_factory=dict)
    average_length_of_stay: float = 0.0
    last_admission_date: str | None = None

    risk_factors: list[RiskFactor] = Field(default_factory=list)


class ForecastHorizon(BaseModel):
    """Projected readmissions over one horizon."""

    horizon_days: int
    predicted_rate: float = Field(ge=0.0, le=1.0)
    predicted_readmissions: int


class CohortRiskEntry(BaseModel):
    """One patient's line in a cohort report."""

    model_config = ConfigDict(from_attributes=True)

    patient_id: int
    medical_record_number: str | None = None
    readmission_probability: float = Field(ge=0.0, le=1.0)
    risk_category: str
    scored_at: datetime | None = None


class ForecastingReport(BaseModel):
    """Hospital or caseload level forecasting report - FR-RPT-02.

    ``horizons`` carries the same projection at several windows so the report
    answers "how many readmissions should we staff for" directly, rather than
    making the caller re-query per horizon.

    ``high_risk_patients`` is omitted entirely for a researcher: the SRS RBAC
    matrix grants them aggregated risk reporting only, never identifiable rows.
    """

    metadata: ReportMetadata

    patients_in_scope: int = 0
    patients_scored: int = 0
    coverage_rate: float = Field(default=0.0, ge=0.0, le=1.0)

    risk_distribution: RiskDistribution = Field(default_factory=RiskDistribution)
    average_risk_probability: float = Field(default=0.0, ge=0.0, le=1.0)

    horizons: list[ForecastHorizon] = Field(default_factory=list)

    total_admissions: int = 0
    observed_readmissions: int = 0
    observed_readmission_rate: float = Field(default=0.0, ge=0.0, le=1.0)

    high_risk_patients: list[CohortRiskEntry] | None = None
