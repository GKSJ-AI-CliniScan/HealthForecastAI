"""Clinical decision support tests - Milestone 3.

Two layers. The rule tests run the engine on hand-built contexts, so each rule is
pinned at its boundary without a database. The endpoint tests prove the scoping,
the audit trail and the safety flags around it.
"""

import pytest

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.prediction import RiskPrediction
from app.services import cds_service
from app.services.cds_service import Context


def ctx(**kwargs) -> Context:
    """A context with sensible defaults, overridden per test."""
    admission = kwargs.pop("admission", {})
    return Context(patient_id=1, admission=admission, **kwargs)


def fired(context: Context) -> set[str]:
    return {item["id"] for item in cds_service.evaluate(context)}


# --------------------------------------------------------------------------
# The rules, at their boundaries
# --------------------------------------------------------------------------


def test_a_high_risk_patient_gets_a_seven_day_follow_up() -> None:
    context = ctx(probability=0.42, band="high", baseline=0.09)
    ids = fired(context)
    recommendations = {r["id"]: r for r in cds_service.evaluate(context)}

    assert "follow-up-high" in ids and "post-discharge-contact" in ids
    assert "7 days" in recommendations["follow-up-high"]["action"]
    assert "4.67x" in recommendations["follow-up-high"]["rationale"]
    assert cds_service.follow_up_days("high") == 7


@pytest.mark.parametrize(
    ("band", "rule", "days"),
    [
        ("high", "follow-up-high", 7),
        ("medium", "follow-up-medium", 14),
        ("low", "follow-up-routine", 30),
    ],
)
def test_each_band_gets_exactly_one_follow_up_rule(band: str, rule: str, days: int) -> None:
    context = ctx(probability=0.2, band=band, baseline=0.09)
    follow_ups = {i for i in fired(context) if i.startswith("follow-up")}
    assert follow_ups == {rule}
    assert cds_service.follow_up_days(band) == days


@pytest.mark.parametrize(("medications", "expected"), [(14, False), (15, True), (28, True)])
def test_polypharmacy_triggers_at_the_threshold(medications: int, expected: bool) -> None:
    context = ctx(band="low", probability=0.05, admission={"num_medications": medications})
    assert ("medication-reconciliation" in fired(context)) is expected


@pytest.mark.parametrize(
    ("visits", "band", "expected"),
    [(1, "high", False), (2, "high", True), (5, "medium", True), (5, "low", False)],
)
def test_repeat_admissions_trigger_care_coordination_unless_risk_is_low(
    visits: int, band: str, expected: bool
) -> None:
    context = ctx(band=band, probability=0.2, admission={"number_inpatient": visits})
    assert ("care-coordination" in fired(context)) is expected


def test_hba1c_missing_only_matters_when_diabetes_is_the_primary_diagnosis() -> None:
    diabetic = ctx(
        band="low", probability=0.05, primary_diagnosis="Diabetes", admission={"a1c_result": None}
    )
    other = ctx(
        band="low",
        probability=0.05,
        primary_diagnosis="Respiratory",
        admission={"a1c_result": None},
    )
    tested = ctx(
        band="low", probability=0.05, primary_diagnosis="Diabetes", admission={"a1c_result": "Norm"}
    )

    assert "hba1c-missing" in fired(diabetic)
    assert "hba1c-missing" not in fired(other)
    assert "hba1c-missing" not in fired(tested)


def test_a_poor_hba1c_result_is_flagged_high_priority() -> None:
    context = ctx(band="low", probability=0.05, admission={"a1c_result": ">8"})
    item = next(i for i in cds_service.evaluate(context) if i["id"] == "hba1c-high")
    assert item["priority"] == "high"
    assert item["evidence"] == {"a1c_result": ">8"}


def test_a_facility_discharge_triggers_a_handover() -> None:
    snf = ctx(
        band="low",
        probability=0.05,
        admission={"discharge_disposition": "Discharged/transferred to SNF"},
    )
    home = ctx(
        band="low", probability=0.05, admission={"discharge_disposition": "Discharged to home"}
    )
    assert "facility-handover" in fired(snf)
    assert "facility-handover" not in fired(home)


def test_a_high_risk_home_discharge_suggests_home_support() -> None:
    home_high = ctx(
        band="high", probability=0.4, admission={"discharge_disposition": "Discharged to home"}
    )
    home_low = ctx(
        band="low", probability=0.04, admission={"discharge_disposition": "Discharged to home"}
    )
    assert "home-support" in fired(home_high)
    assert "home-support" not in fired(home_low)


def test_a_dose_change_triggers_teaching_and_names_the_drug() -> None:
    context = ctx(
        band="low",
        probability=0.05,
        admission={"medication_changed": True},
        treatments=[{"treatment_name": "insulin", "dose_change": "Up"}],
    )
    recommendations = {r["id"]: r for r in cds_service.evaluate(context)}
    assert "regimen-change-teaching" in recommendations
    assert "insulin-titration" in recommendations
    assert recommendations["regimen-change-teaching"]["evidence"]["changed"] == ["insulin (up)"]


def test_a_missing_value_never_fires_a_rule() -> None:
    """Rules must not act on what is not in the record."""
    empty = ctx(band="low", probability=0.05, admission={})
    assert fired(empty) == {"follow-up-routine"}


def test_an_unscored_patient_gets_no_risk_based_rules() -> None:
    context = ctx(admission={"num_medications": 20})
    ids = fired(context)
    assert ids == {"medication-reconciliation"}
    assert not any(i.startswith("follow-up") for i in ids)


def test_recommendations_are_sorted_most_urgent_first() -> None:
    context = ctx(
        band="high",
        probability=0.4,
        baseline=0.09,
        admission={"num_medications": 20, "time_in_hospital": 10, "number_emergency": 3},
    )
    priorities = [r["priority"] for r in cds_service.evaluate(context)]
    order = {"high": 0, "medium": 1, "routine": 2}
    assert priorities == sorted(priorities, key=lambda p: order[p])


def test_every_recommendation_carries_its_reason_and_its_evidence() -> None:
    context = ctx(
        band="high",
        probability=0.4,
        baseline=0.09,
        admission={"num_medications": 20, "number_inpatient": 4, "time_in_hospital": 9},
    )
    for item in cds_service.evaluate(context):
        assert item["rationale"].strip(), f"{item['id']} has no rationale"
        assert item["evidence"], f"{item['id']} lists no evidence"
        assert item["action"].strip()


def test_the_output_is_always_marked_as_needing_clinician_review() -> None:
    context = ctx(band="high", probability=0.4, baseline=0.09)
    for output in (cds_service.recommendations(context), cds_service.discharge_plan(context)):
        assert output["clinical_review_required"] is True
        assert "not clinical advice" in output["disclaimer"]


def test_the_discharge_plan_groups_actions_by_when_they_are_due() -> None:
    context = ctx(
        band="high",
        probability=0.4,
        baseline=0.09,
        admission={"num_medications": 20, "discharge_disposition": "Discharged to home"},
    )
    plan = cds_service.discharge_plan(context)

    assert set(plan["sections"]) == {"before discharge", "at discharge", "after discharge"}
    assert any(a["id"] == "medication-reconciliation" for a in plan["sections"]["before discharge"])
    assert any(a["id"] == "follow-up-high" for a in plan["sections"]["after discharge"])
    assert plan["total_actions"] == sum(len(v) for v in plan["sections"].values())
    assert any("High predicted readmission risk" in flag for flag in plan["flags"])


# --------------------------------------------------------------------------
# The endpoints
# --------------------------------------------------------------------------


@pytest.fixture
def scored_patient(db, make_user, make_patient, make_admission):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id, primary_diagnosis="Diabetes")
    make_admission(patient.id, readmitted="NO", num_medications=20, number_inpatient=3)
    db.add(
        RiskPrediction(
            patient_id=patient.id,
            readmission_probability=0.30,
            risk_category="high",
            model_name="m",
            model_version="1",
            drivers={"baseline_probability": 0.09, "exact": True, "up": [], "down": []},
        )
    )
    db.commit()
    return doctor, patient


def test_a_doctor_gets_recommendations_for_their_own_patient(
    client, scored_patient, auth_header
) -> None:
    doctor, patient = scored_patient
    body = client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}", headers=auth_header(doctor)
    ).json()

    ids = {r["id"] for r in body["recommendations"]}
    assert {"follow-up-high", "medication-reconciliation", "care-coordination"} <= ids
    assert body["follow_up_days"] == 7
    assert body["risk"]["times_the_average_patient"] == pytest.approx(3.33, abs=0.01)
    assert body["clinical_review_required"] is True


def test_another_doctors_patient_is_a_404_not_a_403(
    client, scored_patient, make_user, auth_header
) -> None:
    _, patient = scored_patient
    other = make_user(Role.DOCTOR)
    response = client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}", headers=auth_header(other)
    )
    assert response.status_code == 404


@pytest.mark.parametrize("role", [Role.HOSPITAL_ADMIN, Role.RESEARCHER])
def test_only_clinicians_generate_care_recommendations(
    role: Role, client, scored_patient, make_user, auth_header
) -> None:
    _, patient = scored_patient
    actor = make_user(role)
    path = f"/api/v1/clinical-support/recommendations/{patient.id}"
    assert client.get(path, headers=auth_header(actor)).status_code == 403


def test_the_discharge_plan_endpoint_returns_sections(client, scored_patient, auth_header) -> None:
    doctor, patient = scored_patient
    plan = client.get(
        f"/api/v1/clinical-support/discharge-plan/{patient.id}", headers=auth_header(doctor)
    ).json()
    assert plan["total_actions"] > 0
    assert "before discharge" in plan["sections"]


def test_generating_recommendations_is_audited(client, db, scored_patient, auth_header) -> None:
    doctor, patient = scored_patient
    client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}", headers=auth_header(doctor)
    )

    entry = db.query(AuditLog).filter(AuditLog.action == "cds.recommendations").one()
    assert entry.actor_id == doctor.id and entry.resource == f"patient:{patient.id}"


def test_the_rules_are_published_for_clinical_review(client, make_user, auth_header) -> None:
    """A clinician must be able to read exactly what runs."""
    doctor = make_user(Role.DOCTOR)
    body = client.get("/api/v1/clinical-support/rules", headers=auth_header(doctor)).json()

    assert body["version"] == cds_service.RULES_VERSION
    assert body["thresholds"]["polypharmacy_medications"] == 15
    assert len(body["rules"]) == len(cds_service.RULES)
    assert all(rule["action"] for rule in body["rules"])
