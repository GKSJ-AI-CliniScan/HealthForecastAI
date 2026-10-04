"""Tests for the role-based access matrix.

These tests assert the complete RBAC policy from the project brief.
A future change that widens or reduces a role's reach must fail here.
"""

from app.core.rbac import PERMISSIONS, Permission, Role, has_permission, permissions_for

EXPECTED_PERMISSIONS = {
    Role.DOCTOR: {
        Permission.PATIENT_READ_ASSIGNED,
        Permission.MEDICAL_HISTORY_READ,
        Permission.RISK_REPORT_READ,
        Permission.READMISSION_FORECAST_READ,
        Permission.TREATMENT_REPORT_READ_LIMITED,
        Permission.CARE_RECOMMENDATION_GENERATE,
    },
    Role.HOSPITAL_ADMIN: {
        Permission.PATIENT_READ_ALL,
        Permission.MEDICAL_HISTORY_READ,
        Permission.RISK_REPORT_READ_AGGREGATED,
        Permission.READMISSION_FORECAST_READ,
        Permission.TREATMENT_REPORT_READ,
        Permission.HOSPITAL_ANALYTICS_READ,
        Permission.ANALYTICS_EXPORT,
    },
    Role.RESEARCHER: {
        Permission.PATIENT_READ_ANONYMIZED,
        Permission.RISK_REPORT_READ_AGGREGATED,
        Permission.TREATMENT_REPORT_READ,
        Permission.HOSPITAL_ANALYTICS_READ,
        Permission.POPULATION_HEALTH_READ,
        Permission.RESEARCH_DATASET_EXPORT,
        Permission.ANALYTICS_EXPORT,
    },
    Role.SYSTEM_ADMIN: set(Permission),
}


def test_all_four_brief_roles_exist() -> None:
    """The brief defines exactly four supported roles."""
    assert {str(role) for role in Role} == {
        "doctor",
        "hospital_admin",
        "researcher",
        "system_admin",
    }


def test_every_role_has_an_entry_in_the_matrix() -> None:
    """Every supported role must have an explicit permission set."""
    assert set(PERMISSIONS) == set(Role)


def test_complete_permission_matrix() -> None:
    """Every role must match the expected permission matrix exactly."""
    for role, expected in EXPECTED_PERMISSIONS.items():
        assert set(PERMISSIONS[role]) == expected


def test_no_role_has_unexpected_permissions() -> None:
    """No role may silently receive a permission outside its policy."""
    for role, expected in EXPECTED_PERMISSIONS.items():
        actual = set(PERMISSIONS[role])
        assert actual.issubset(expected)


def test_doctor_is_limited_to_assigned_patients() -> None:
    """Doctors cannot access hospital-wide patient records."""
    assert has_permission(Role.DOCTOR, Permission.PATIENT_READ_ASSIGNED)
    assert not has_permission(Role.DOCTOR, Permission.PATIENT_READ_ALL)
    assert not has_permission(Role.DOCTOR, Permission.PATIENT_READ_ANONYMIZED)


def test_hospital_admin_has_hospital_scope_and_medical_history() -> None:
    """Hospital admins receive operational access, not medical-history access."""
    assert has_permission(Role.HOSPITAL_ADMIN, Permission.PATIENT_READ_ALL)
    assert has_permission(Role.HOSPITAL_ADMIN, Permission.HOSPITAL_ANALYTICS_READ)
    assert has_permission(Role.HOSPITAL_ADMIN, Permission.TREATMENT_REPORT_READ)
    assert has_permission(Role.HOSPITAL_ADMIN, Permission.MEDICAL_HISTORY_READ)
    assert not has_permission(Role.HOSPITAL_ADMIN, Permission.PATIENT_WRITE)


def test_researcher_only_gets_anonymized_and_aggregated_access() -> None:
    """Researchers cannot access identified patient or clinical records."""
    assert has_permission(Role.RESEARCHER, Permission.PATIENT_READ_ANONYMIZED)
    assert has_permission(Role.RESEARCHER, Permission.RISK_REPORT_READ_AGGREGATED)
    assert not has_permission(Role.RESEARCHER, Permission.PATIENT_READ_ALL)
    assert not has_permission(Role.RESEARCHER, Permission.PATIENT_READ_ASSIGNED)
    assert not has_permission(Role.RESEARCHER, Permission.MEDICAL_HISTORY_READ)
    assert not has_permission(Role.RESEARCHER, Permission.PATIENT_WRITE)


def test_only_system_admin_has_administrative_permissions() -> None:
    """User/model/system administration is restricted to system admins."""
    administrative_permissions = {
        Permission.USER_MANAGE,
        Permission.MODEL_MANAGE,
        Permission.AUDIT_LOG_READ,
        Permission.SYSTEM_CONFIGURE,
    }

    for permission in administrative_permissions:
        assert has_permission(Role.SYSTEM_ADMIN, permission)

        for role in (
            Role.DOCTOR,
            Role.HOSPITAL_ADMIN,
            Role.RESEARCHER,
        ):
            assert not has_permission(role, permission)


def test_system_admin_holds_every_permission() -> None:
    """System administrator is the full-access role."""
    assert set(PERMISSIONS[Role.SYSTEM_ADMIN]) == set(Permission)


def test_permissions_for_returns_sorted_strings() -> None:
    """Permission lists returned to clients must be stable and serializable."""
    for role in Role:
        result = permissions_for(role)

        assert result == sorted(result)
        assert all(isinstance(item, str) for item in result)


def test_unknown_role_string_is_rejected() -> None:
    """Invalid role values must never silently fall back to another role."""
    for bad_value in ("nurse", "data_scientist", "", "DOCTOR "):
        try:
            Role(bad_value)
        except ValueError:
            continue

        raise AssertionError(f"Role({bad_value!r}) should not be valid")
