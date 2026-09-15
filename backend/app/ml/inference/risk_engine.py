"""Risk scoring engine and clinical insight decision-support rules."""

from __future__ import annotations

from app.core.config import settings

# Risk category constants
RISK_CATEGORY_LOW = "LOW"
RISK_CATEGORY_MEDIUM = "MEDIUM"
RISK_CATEGORY_HIGH = "HIGH"
RISK_CATEGORY_CRITICAL = "CRITICAL"


class RiskEngine:
    """Configurable risk scoring and clinical decision-support engine."""

    def __init__(
        self,
        low_max: int | None = None,
        medium_max: int | None = None,
        high_max: int | None = None,
    ):
        # Defaults derived from settings or standard thresholds
        self.low_max = low_max if low_max is not None else getattr(settings, "RISK_LOW_MAX", 25)
        self.medium_max = (
            medium_max if medium_max is not None else getattr(settings, "RISK_MEDIUM_MAX", 50)
        )
        self.high_max = high_max if high_max is not None else getattr(settings, "RISK_HIGH_MAX", 75)

    def calculate_risk_score(self, probability: float) -> int:
        """Convert a 0.0-1.0 readmission probability into a 0-100 integer score."""
        prob_clamped = max(0.0, min(1.0, float(probability)))
        return int(round(prob_clamped * 100))

    def determine_risk_category(self, risk_score: int) -> str:
        """Classify a 0-100 risk score into standard clinical bands."""
        if risk_score <= self.low_max:
            return RISK_CATEGORY_LOW
        elif risk_score <= self.medium_max:
            return RISK_CATEGORY_MEDIUM
        elif risk_score <= self.high_max:
            return RISK_CATEGORY_HIGH
        else:
            return RISK_CATEGORY_CRITICAL

    def generate_clinical_insights(self, risk_category: str, risk_score: int) -> str:
        """Generate clinical decision-support recommendation note based on risk band."""
        if risk_category == RISK_CATEGORY_CRITICAL:
            return (
                "Patient is in the CRITICAL readmission risk band. Immediate multidisciplinary "
                "discharge planning, comprehensive medication reconciliation, and rapid 48-72 hour "
                "post-discharge clinical follow-up are strongly recommended."
            )
        elif risk_category == RISK_CATEGORY_HIGH:
            return (
                "Patient has an elevated predicted readmission risk. Review relevant clinical history, "
                "verify chronic disease management adherence, and schedule structured 7-day outpatient follow-up."
            )
        elif risk_category == RISK_CATEGORY_MEDIUM:
            return (
                "Patient shows moderate predicted readmission risk. Review patient history, address potential "
                "social determinants, and ensure standard routine post-discharge care coordination."
            )
        else:
            return (
                "Patient has a lower predicted readmission probability based on the current model. "
                "Continue standard discharge protocol and routine monitoring."
            )


# Default singleton instance
risk_engine = RiskEngine()
