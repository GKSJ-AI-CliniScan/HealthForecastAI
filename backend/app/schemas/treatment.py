"""Treatment effectiveness and outcome analytics schemas - Milestone 3."""

from pydantic import BaseModel, Field


class GroupRate(BaseModel):
    """An event rate for one group, with its 95% Wilson interval."""

    n: int
    events: int
    rate: float = Field(ge=0.0, le=1.0)
    ci_low: float
    ci_high: float


class AdjustedEffect(BaseModel):
    """Crude and adjusted odds ratios for one exposure.

    The adjusted figure is a Mantel-Haenszel pooled odds ratio across strata of
    age band, prior inpatient visits and primary diagnosis group. When the crude
    and adjusted answers disagree, `confounding_flag` says so - that disagreement
    is the signature of confounding by indication.
    """

    crude_odds_ratio: float | None = None
    crude_ci: list[float] | None = None
    adjusted_odds_ratio: float | None = None
    adjusted_ci: list[float] | None = None
    strata_used: int = 0
    significant: bool = False
    interpretation: str
    confounding_flag: bool = False


class MedicationEffect(BaseModel):
    """How admissions on one drug ended, compared with admissions not on it."""

    treatment_name: str
    patients_treated: int
    suppressed: bool = Field(
        default=False,
        description="True when a group is too small to report without risking re-identification",
    )
    treated: GroupRate | None = None
    not_treated: GroupRate | None = None
    rate_difference_points: float | None = Field(
        default=None, description="Treated minus not treated, in percentage points"
    )
    effect: AdjustedEffect | None = None
    average_length_of_stay_treated: float | None = None
    average_length_of_stay_not_treated: float | None = None
    dose_changes: dict[str, int] = Field(default_factory=dict)


class MedicationReport(BaseModel):
    """The full medication outcome report."""

    scope: str
    outcome: str
    adjusted_for: list[str]
    min_cell: int
    caveat: str
    medications: list[MedicationEffect]


class DoseChangeContrast(BaseModel):
    """One dose-change comparison within a drug, e.g. dose raised vs held steady."""

    comparison: str
    exposed: GroupRate | None = None
    reference: GroupRate | None = None
    effect: AdjustedEffect | None = None
    suppressed: bool = False


class MedicationDetail(BaseModel):
    """One drug in depth: the overall effect plus what a dose change did."""

    medication: MedicationEffect
    dose_change_contrasts: list[DoseChangeContrast]
    adjusted_for: list[str]
    caveat: str


class CareProcessEffect(BaseModel):
    """The effect of a care process (a test, a change of regimen) on readmission."""

    name: str
    description: str
    cohort: str
    exposed_label: str
    reference_label: str
    exposed: GroupRate | None = None
    reference: GroupRate | None = None
    effect: AdjustedEffect | None = None
    suppressed: bool = False


class CareProcessReport(BaseModel):
    """Care process effects, with the same stratification and caveats."""

    scope: str
    adjusted_for: list[str]
    caveat: str
    processes: list[CareProcessEffect]


class RecoveryRow(BaseModel):
    """Recovery proxy rates for one slice of the population."""

    group: str
    n: int
    stable_recovery: GroupRate | None = None
    no_readmission_rate: float | None = None
    home_discharge_rate: float | None = None
    average_length_of_stay: float | None = None
    suppressed: bool = False


class RecoveryReport(BaseModel):
    """Recovery outcomes.

    The source data has no clinical recovery score, and inventing one would be
    fabrication. "Stable recovery" is a documented proxy: no readmission within
    30 days AND discharged home (with or without home health). It measures
    whether the patient stayed out of hospital and went home - not how well they
    are.
    """

    scope: str
    definition: str
    overall: RecoveryRow
    by_age_group: list[RecoveryRow]
    by_diagnosis_group: list[RecoveryRow]
    by_treatment: list[RecoveryRow]
    caveat: str
