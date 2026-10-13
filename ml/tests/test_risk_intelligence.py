"""Risk intelligence layer for clinical risk prediction."""

from typing import Any, Dict, Optional, Union
import numpy as np
import pandas as pd

RECOMMENDATIONS: Dict[str, str] = {
    "Low": "Routine monitoring and standard preventative care.",
    "Medium": "Enhanced clinical monitoring and follow-up assessment.",
    "High": "Immediate clinical intervention and specialized consultation.",
}


def assign_risk_levels(
    scores: Union[np.ndarray, pd.Series],
    medium_cut: float = 0.3,
    high_cut: float = 0.6,
) -> np.ndarray:
    """Assign categorical risk levels ('Low', 'Medium', 'High') based on cut-off points."""
    if medium_cut >= high_cut:
        raise ValueError(
            f"medium_cut ({medium_cut}) must be strictly less than high_cut ({high_cut})."
        )

    scores_arr = np.asarray(scores)
    levels = np.empty(scores_arr.shape, dtype=object)

    levels[scores_arr < medium_cut] = "Low"
    levels[(scores_arr >= medium_cut) & (scores_arr < high_cut)] = "Medium"
    levels[scores_arr >= high_cut] = "High"

    return levels


def predict_risk(
    features: pd.DataFrame,
    bundle: Dict[str, Any],
    medium_cut: Optional[float] = None,
    high_cut: float = 0.6,
) -> pd.DataFrame:
    """Predict risk scores, categorical risk levels, and clinical recommendations."""
    pipeline = bundle["pipeline"]
    if medium_cut is None:
        medium_cut = float(bundle.get("decision_threshold", 0.3))

    if hasattr(pipeline, "predict_proba"):
        risk_scores = pipeline.predict_proba(features)[:, 1]
    elif hasattr(pipeline, "decision_function"):
        decision = pipeline.decision_function(features)
        risk_scores = 1.0 / (1.0 + np.exp(-decision))
    else:
        risk_scores = pipeline.predict(features).astype(float)

    risk_levels = assign_risk_levels(risk_scores, medium_cut=medium_cut, high_cut=high_cut)
    recommendations = [RECOMMENDATIONS[level] for level in risk_levels]

    return pd.DataFrame(
        {
            "risk_score": risk_scores,
            "risk_level": risk_levels,
            "clinical_recommendation": recommendations,
        },
        index=features.index,
    )
