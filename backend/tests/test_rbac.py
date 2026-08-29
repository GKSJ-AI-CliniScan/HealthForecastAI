"""Tests for the role-based access matrix.

These assert the policy itself, so a future change that quietly widens a role's
reach fails here rather than in production.
"""

from app.core.rbac import PERMISSIONS, Permission, Role, has_permission, permissions_for


def test_all_four_brief_roles_exist() -> None:
    """The brief names exactly four roles; nothing extra may be added silently."""
    assert {str(role) for role in Role} == {
        "doctor",
        "hospital_admin",
        "researcher",
        "system_admin",
    }


def test_every_role_has_an_entry_in_the_matrix() -> None:
    """A role missing from PERMISSIONS would silently receive no access at all."""
    assert set(PERMISSIONS) == set(Role)


def test_doctor_cannot_read_the_whole_hospital() -> None:
    """A doctor is scoped to assigned patients only."""
    assert has_permission(Role.DOCTOR, Permission.PATIENT_READ_ASSIGNED)
    assert not has_permission(Role.DOCTOR, Permission.PATIENT_READ_ALL)


def test_researcher_never_reads_identified_patients() -> None:
    """Research access is de-identified by policy, not by convention."""
    assert has_permission(Role.RESEARCHER, Permission.PATIENT_READ_ANONYMIZED)
    assert not has_permission(Role.RESEARCHER, Permission.PATIENT_READ_ALL)
    assert not has_permission(Role.RESEARCHER, Permission.PATIENT_READ_ASSIGNED)
    assert not has_permission(Role.RESEARCHER, Permission.MEDICAL_HISTORY_READ)


def test_only_system_admin_manages_users() -> None:
    """Account creation must not be reachable from a clinical or research role."""
    assert has_permission(Role.SYSTEM_ADMIN, Permission.USER_MANAGE)
    for role in (Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.RESEARCHER):
        assert not has_permission(role, Permission.USER_MANAGE)


def test_hospital_admin_sees_aggregates_not_clinical_notes() -> None:
    """Administrators run the hospital; they do not read medical histories."""
    assert has_permission(Role.HOSPITAL_ADMIN, Permission.HOSPITAL_ANALYTICS_READ)
    assert not has_permission(Role.HOSPITAL_ADMIN, Permission.MEDICAL_HISTORY_READ)


def test_system_admin_holds_every_permission() -> None:
    """The administrative role is the superset by definition."""
    assert set(PERMISSIONS[Role.SYSTEM_ADMIN]) == set(Permission)


def test_permissions_for_returns_sorted_strings() -> None:
    """The frontend renders this list directly, so ordering must be stable."""
    result = permissions_for(Role.DOCTOR)
    assert result == sorted(result)
    assert all(isinstance(item, str) for item in result)


def test_unknown_role_string_is_rejected() -> None:
    """Constructing a Role from a bad value must raise, never default."""
    for bad_value in ("nurse", "data_scientist", "", "DOCTOR "):
        try:
            Role(bad_value)
        except ValueError:
            continue
        raise AssertionError(f"Role({bad_value!r}) should not be valid")
