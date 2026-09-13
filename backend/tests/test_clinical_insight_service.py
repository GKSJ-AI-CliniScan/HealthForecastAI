from app.services.clinical_insight_service import (
    generate_clinical_insights,
)


def test_generates_risk_summary() -> None:
    insights = generate_clinical_insights(
        probability=0.65,
        risk_category="medium",
        drivers=[],
    )

    assert insights[0]["title"] == "Estimated readmission risk: 65.0%"
    assert "medium risk" in insights[0]["detail"]
    assert insights[0]["severity"] == "medium"


def test_generates_increasing_risk_insight() -> None:
    drivers = [
        {
            "feature": "Previous inpatient visits",
            "value": None,
            "contribution": 0.31,
            "direction": "increases_risk",
        }
    ]

    insights = generate_clinical_insights(
        probability=0.55,
        risk_category="medium",
        drivers=drivers,
    )

    assert any(insight["title"] == "Factors increasing predicted risk" for insight in insights)


def test_generates_decreasing_risk_insight() -> None:
    drivers = [
        {
            "feature": "Age group",
            "value": None,
            "contribution": -0.46,
            "direction": "decreases_risk",
        }
    ]

    insights = generate_clinical_insights(
        probability=0.20,
        risk_category="low",
        drivers=drivers,
    )

    assert any(insight["title"] == "Factors reducing predicted risk" for insight in insights)
