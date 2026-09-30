"""Treatment effectiveness tests - Milestone 3.

The centrepiece is the confounding scenario: a drug with no effect whatsoever
that looks harmful on crude rates because it is given to sicker patients. If the
stratified analysis regresses to the crude one, these tests fail.
"""

import pytest

from app.core.rbac import Role


@pytest.fixture
def confounded(make_cohort):
    """A drug with NO effect, given mostly to the sick.

    Sick stratum: readmission is 50% whether or not the patient got the drug.
    Well stratum: 10% either way. 80 of 100 sick patients got the drug, but only
    20 of 100 well ones - so the treated group is sicker, and crudely worse.
    """
    make_cohort(40, 20, age_group="70-80", number_inpatient=3, drug="insulin")
    make_cohort(40, 20, age_group="70-80", number_inpatient=3, drug="insulin")
    make_cohort(20, 10, age_group="70-80", number_inpatient=3)
    make_cohort(
        20, 2, age_group="30-40", number_inpatient=0, diagnosis="Circulatory", drug="insulin"
    )
    make_cohort(80, 8, age_group="30-40", number_inpatient=0, diagnosis="Circulatory")


def medication(report: dict, name: str) -> dict:
    return next(m for m in report["medications"] if m["treatment_name"] == name)


def test_a_drug_with_no_effect_looks_harmful_crudely_but_not_once_adjusted(
    client, confounded, make_user, auth_header
) -> None:
    """Confounding by indication, end to end through the API."""
    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get("/api/v1/treatment", headers=auth_header(admin)).json()
    effect = medication(report, "insulin")["effect"]

    assert effect["crude_odds_ratio"] > 2.5, "crudely the drug looks like it triples the odds"
    assert effect["adjusted_odds_ratio"] == pytest.approx(
        1.0, abs=0.05
    ), "adjusted, it does nothing"
    assert effect["confounding_flag"] is True, "and the disagreement is reported"
    assert effect["significant"] is False
    assert "No clear association" in effect["interpretation"]


def test_every_response_says_it_is_an_association_not_a_cause(
    client, confounded, make_user, auth_header
) -> None:
    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get("/api/v1/treatment", headers=auth_header(admin)).json()

    assert "do not prove" in report["caveat"]
    assert "age band" in report["adjusted_for"]
    assert "primary diagnosis group" in report["adjusted_for"]


def test_a_real_effect_survives_adjustment(client, make_cohort, make_user, auth_header) -> None:
    """The adjustment must not erase a genuine difference."""
    # Same stratum on both arms, so there is nothing to confound: 30% vs 10%.
    make_cohort(200, 60, age_group="60-70", number_inpatient=1, drug="metformin")
    make_cohort(200, 20, age_group="60-70", number_inpatient=1)

    admin = make_user(Role.HOSPITAL_ADMIN)
    effect = medication(
        client.get("/api/v1/treatment", headers=auth_header(admin)).json(), "metformin"
    )["effect"]

    assert effect["adjusted_odds_ratio"] > 3
    assert effect["significant"] is True
    assert effect["confounding_flag"] is False
    assert "higher odds" in effect["interpretation"]


def test_small_groups_are_suppressed_not_reported(
    client, make_cohort, make_user, auth_header
) -> None:
    """A drug given to five patients must not produce a rate."""
    make_cohort(200, 20, age_group="60-70")
    make_cohort(5, 2, age_group="60-70", drug="acarbose")

    admin = make_user(Role.HOSPITAL_ADMIN)
    rare = medication(
        client.get("/api/v1/treatment", headers=auth_header(admin)).json(), "acarbose"
    )

    assert rare["suppressed"] is True
    assert rare["patients_treated"] == 5
    assert rare.get("treated") is None and rare.get("effect") is None


def test_a_doctor_sees_only_their_own_caseload(client, make_cohort, make_user, auth_header) -> None:
    """'Limited' access means scope: a doctor's numbers cover their patients only."""
    mine = make_user(Role.DOCTOR)
    theirs = make_user(Role.DOCTOR)
    make_cohort(60, 6, doctor_id=mine.id, drug="insulin")
    make_cohort(40, 4, doctor_id=mine.id)
    make_cohort(300, 30, doctor_id=theirs.id, drug="insulin")

    report = client.get("/api/v1/treatment", headers=auth_header(mine)).json()

    assert report["scope"] == "your caseload"
    assert medication(report, "insulin")["patients_treated"] == 60, "not 360"


def test_dose_change_contrasts_compare_against_steady(
    client, make_cohort, make_user, auth_header
) -> None:
    """Raised vs steady is reported per drug, stratified like everything else."""
    make_cohort(80, 16, number_inpatient=1, drug="insulin", dose_change="Steady")
    make_cohort(60, 18, number_inpatient=1, drug="insulin", dose_change="Up")
    make_cohort(60, 6, number_inpatient=1, drug="insulin", dose_change="Down")

    admin = make_user(Role.HOSPITAL_ADMIN)
    detail = client.get("/api/v1/treatment/medications/insulin", headers=auth_header(admin)).json()

    assert detail["medication"]["dose_changes"] == {"Steady": 80, "Up": 60, "Down": 60}
    raised, lowered = detail["dose_change_contrasts"]
    assert "raised" in raised["comparison"] and "lowered" in lowered["comparison"]
    assert raised["effect"]["adjusted_odds_ratio"] > 1 > lowered["effect"]["adjusted_odds_ratio"]


def test_an_unknown_medication_is_a_404(client, make_user, auth_header) -> None:
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/treatment/medications/unobtainium", headers=auth_header(admin))
    assert response.status_code == 404


def test_hba1c_testing_is_compared_with_no_testing(
    client, make_cohort, make_user, auth_header
) -> None:
    make_cohort(150, 12, age_group="50-60", diagnosis="Diabetes", a1c_result="Norm")
    make_cohort(150, 24, age_group="50-60", diagnosis="Diabetes")

    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get("/api/v1/treatment/care-processes", headers=auth_header(admin)).json()
    a1c = next(p for p in report["processes"] if p["cohort"] == "primary diagnosis diabetes")

    assert a1c["exposed"]["n"] == 150 and a1c["reference"]["n"] == 150
    assert a1c["exposed"]["rate"] < a1c["reference"]["rate"]
    assert a1c["effect"]["adjusted_odds_ratio"] < 1


def test_recovery_is_a_documented_proxy_not_a_clinical_score(
    client, make_cohort, make_user, auth_header
) -> None:
    """Stable recovery = no 30-day readmission AND discharged home."""
    make_cohort(100, 10, age_group="50-60")
    make_cohort(100, 0, age_group="80-90", discharge_disposition="Discharged/transferred to SNF")

    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get("/api/v1/treatment/recovery", headers=auth_header(admin)).json()

    assert "proxy" in report["definition"]
    overall = report["overall"]
    assert overall["n"] == 200
    # 90 of the first group recovered; none of the SNF group went home.
    assert overall["stable_recovery"]["events"] == 90
    assert overall["no_readmission_rate"] == pytest.approx(0.95)
    assert overall["home_discharge_rate"] == pytest.approx(0.5)


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.DOCTOR, 200),
        (Role.HOSPITAL_ADMIN, 200),
        (Role.RESEARCHER, 200),
        (Role.SYSTEM_ADMIN, 200),
    ],
)
def test_every_role_with_a_treatment_permission_can_read_reports(
    role: Role, expected: int, client, make_user, auth_header
) -> None:
    actor = make_user(role)
    assert client.get("/api/v1/treatment", headers=auth_header(actor)).status_code == expected


def test_treatment_reports_require_authentication(client) -> None:
    assert client.get("/api/v1/treatment").status_code == 401
    assert client.get("/api/v1/treatment/recovery").status_code == 401


def test_reading_a_treatment_report_is_audited(
    client, db, confounded, make_user, auth_header
) -> None:
    from app.models.audit_log import AuditLog

    admin = make_user(Role.HOSPITAL_ADMIN)
    client.get("/api/v1/treatment", headers=auth_header(admin))

    entry = db.query(AuditLog).filter(AuditLog.action == "treatment.report").one()
    assert entry.actor_id == admin.id
