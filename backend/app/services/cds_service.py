"""CDS (Clinical Decision Support) service - business logic layer.

Generates rule-based clinical insights and actionable interventions.
"""

from typing import Any


def generate_clinical_insights(
    data: dict[str, Any], probability: float
) -> tuple[list[str], list[str]]:
    """Identifies contributing risk drivers and suggests evidence-based clinical interventions."""
    factors: list[str] = []
    actions: list[str] = []

    # Prior utilization
    prior_inpatient = int(data.get("number_inpatient", 0))
    prior_emergency = int(data.get("number_emergency", 0))

    if prior_inpatient >= 2:
        factors.append(
            f"High inpatient utilization ({prior_inpatient} admissions in prior 12 months)"
        )
        actions.append("Schedule post-discharge primary care follow-up within 48 to 72 hours")
    elif prior_inpatient == 1:
        factors.append("Recent inpatient hospital encounter documented")

    if prior_emergency > 0:
        factors.append(f"Frequent emergency department encounters ({prior_emergency} visits)")
        actions.append("Enroll patient in community-based transition care program")

    # Inpatient stay length
    time_in_hospital = int(data.get("time_in_hospital", 0))
    if time_in_hospital >= 7:
        factors.append(f"Extended hospital length of stay ({time_in_hospital} days)")
        actions.append("Arrange dedicated care coordination and discharge nurse review")

    # Polypharmacy
    num_medications = int(data.get("num_medications", 0))
    if num_medications >= 15:
        factors.append(f"Polypharmacy detected ({num_medications} active prescribed medications)")
        actions.append("Conduct clinical pharmacist medication reconciliation before discharge")

    # Glycemic control
    a1c_result = str(data.get("A1Cresult", "None")).strip().lower()
    if a1c_result in [">8", "high", "> 8"]:
        factors.append("Poor glycemic management (HbA1c level exceeds 8%)")
        actions.append("Order outpatient endocrine or certified diabetes educator consultation")

    # Defaults for baseline risk cases
    if not factors:
        factors.append("Standard clinical profile with no acute readmission risk alerts")
    if not actions:
        actions.append("Follow routine 30-day post-discharge clinical care plan")

    return factors, actions
