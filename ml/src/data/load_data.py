"""Dataset loading and target construction, shared by every dataset profile.

The raw CSV is NOT committed to git. Download it into ml/data/raw/ first: see
ml/data/README.md.
"""

from pathlib import Path

import pandas as pd


def load_raw(path: str | Path, na_values: list[str] | None = None) -> pd.DataFrame:
    """Read a raw hospital admissions export.

    ``na_values`` is profile-specific: the Diabetes 130-US export encodes
    missing values as "?" only, while the India Hospital Readmission export
    uses a wider set of missing-value tokens (mirrors
    backend/app/services/dataset_import_service.py's NA_TOKENS, so the ML
    pipeline and the Postgres importer treat the same cell as missing the
    same way). Defaults to "?" only when not given, matching the original
    Diabetes-only behaviour.
    """
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Raw dataset not found at {csv_path}. See ml/data/README.md for the "
            "download instructions - datasets are never committed to git."
        )
    tokens = na_values if na_values is not None else ["?"]
    return pd.read_csv(csv_path, na_values=tokens, keep_default_na=True, low_memory=False)


def binarise_readmission_target(series: pd.Series, positive_label: str = "<30") -> pd.Series:
    """Convert the three-way readmitted column into a 30-day readmission flag.

    The brief targets readmission within 30 days, so ">30" and "NO" are both
    negative outcomes. This is the label for the readmission forecasting
    model - see binarise_risk_target below for the separate, broader risk
    target.
    """
    return (series.astype(str).str.strip() == positive_label).astype(int)


def binarise_risk_target(series: pd.Series, negative_label: str = "NO") -> pd.Series:
    """Convert the readmitted column into a broader "any readmission" risk flag.

    Deliberately a different, wider signal than binarise_readmission_target:
    both "<30" and ">30" count as positive here, since the Patient Risk
    Intelligence model is meant to synthesise a holistic risk picture rather
    than forecast one specific horizon (HealthForecastAI_ML_Design.md section
    2, "Risk intelligence problem"). Neither dataset available to this
    pipeline carries a separate clinical deterioration/complication flag, so
    "was this patient readmitted at all" is the broadest honest adverse-
    outcome signal these exports support. This is a documented modelling
    decision, not a silently invented proxy - risk_category (Low/Medium/High)
    is derived later from this model's predicted probability, never from this
    binary label directly.
    """
    return (series.astype(str).str.strip() != negative_label).astype(int)
