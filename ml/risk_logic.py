"""
risk_logic.py  --  Milestone 2/3 logic extracted into importable, testable functions.

Your Milestone2.py / Milestone_3.py define these as nested functions or notebook
cells, which cannot be imported by tests. Put this file in HealthForecastAI/ml/src/
(e.g. src/risk/risk_logic.py), then in your scripts replace the inline copies with
    from src.risk.risk_logic import assign_risk_level, clinical_insight, ...
Thresholds/wording are IDENTICAL to your code (0.7 / 0.4). Two hardening changes:
invalid scores (NaN, <0, >1) and unknown levels now raise ValueError instead of
silently becoming "Low".
"""
from __future__ import annotations
import math
import pandas as pd

HIGH_THRESHOLD = 0.7
MEDIUM_THRESHOLD = 0.4
LEVEL_ORDER = ["Low", "Medium", "High"]
AGE_ORDER = ["[0-10)", "[10-20)", "[20-30)", "[30-40)", "[40-50)",
             "[50-60)", "[60-70)", "[70-80)", "[80-90)", "[90-100)"]


def assign_risk_level(score: float) -> str:
    if score is None or (isinstance(score, float) and math.isnan(score)) or not (0.0 <= score <= 1.0):
        raise ValueError(f"risk score must be a probability in [0, 1], got {score!r}")
    if score >= HIGH_THRESHOLD:
        return "High"
    if score >= MEDIUM_THRESHOLD:
        return "Medium"
    return "Low"


def clinical_insight(risk_level: str) -> str:
    if risk_level == "High":
        return ("Recommend intensive follow-up within 7 days, "
                "medication review, care coordinator assigned.")
    if risk_level == "Medium":
        return "Recommend standard follow-up within 14-30 days, monitor symptoms."
    if risk_level == "Low":
        return "Low risk: routine discharge instructions sufficient."
    raise ValueError(f"unknown risk level: {risk_level!r}")


def build_analysis_df(frame: pd.DataFrame, risk_scores) -> pd.DataFrame:
    """Attach risk outputs to the human-readable frame (Milestone 3 'analysis_df')."""
    if len(frame) != len(risk_scores):
        raise ValueError(f"length mismatch: frame={len(frame)} scores={len(risk_scores)}")
    out = frame.copy()
    out["risk_score"] = list(risk_scores)
    out["risk_level"] = out["risk_score"].apply(assign_risk_level)
    out["clinical_recommendation"] = out["risk_level"].apply(clinical_insight)
    return out


def treatment_eval(df: pd.DataFrame, target_col: str) -> pd.DataFrame:
    return df.groupby("change")[target_col].value_counts(normalize=True).unstack()


def med_effectiveness(df: pd.DataFrame, target_col: str) -> pd.DataFrame:
    return df.groupby("diabetesMed")[target_col].value_counts(normalize=True).unstack()


def recovery_summary(df: pd.DataFrame) -> pd.DataFrame:
    return (df.groupby("risk_level")["time_in_hospital"]
              .agg(avg_stay="mean", median_stay="median", max_stay="max")
              .reindex(LEVEL_ORDER))


def performance_dashboard(df: pd.DataFrame, target_col: str, positive_label: str = "<30") -> dict:
    return {
        "total_patients": len(df),
        "avg_risk_score": df["risk_score"].mean(),
        "high_risk_pct": (df["risk_level"] == "High").mean() * 100,
        "avg_time_in_hospital": df["time_in_hospital"].mean(),
        "avg_medications": df["num_medications"].mean(),
        "readmission_rate_30d": (df[target_col] == positive_label).mean() * 100,
    }


def outcome_by_age(df: pd.DataFrame) -> pd.DataFrame:
    return (df.groupby("age")["risk_level"].value_counts(normalize=True)
              .unstack().reindex(AGE_ORDER))
