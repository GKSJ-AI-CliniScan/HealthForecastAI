"""Clinical insight generation from model-derived risk drivers."""

from typing import Any


def generate_clinical_insights(
    *,
    probability: float,
    risk_category: str,
    drivers: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Generate conservative, model-grounded clinical insights."""

    insights: list[dict[str, str]] = []

    percentage = probability * 100

    insights.append(
        {
            "title": f"Estimated readmission risk: {percentage:.1f}%",
            "detail": (f"The model categorises this patient as " f"{risk_category} risk."),
            "severity": risk_category,
        }
    )

    increasing = [driver for driver in drivers if driver["direction"] == "increases_risk"]

    decreasing = [driver for driver in drivers if driver["direction"] == "decreases_risk"]

    if increasing:
        names = [driver["feature"] for driver in increasing[:3]]

        insights.append(
            {
                "title": "Factors increasing predicted risk",
                "detail": ", ".join(names),
                "severity": "attention",
            }
        )

    if decreasing:
        names = [driver["feature"] for driver in decreasing[:3]]

        insights.append(
            {
                "title": "Factors reducing predicted risk",
                "detail": ", ".join(names),
                "severity": "informational",
            }
        )

    return insights
