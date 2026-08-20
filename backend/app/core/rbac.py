"""Role-Based Access Control definitions.

Mirrors the Access Matrix in the project brief (section 4, User Management Module).
Interns extend PERMISSIONS as new features land - do not weaken existing restrictions.
"""

from enum import StrEnum


class Role(StrEnum):
    """The four operational roles supported by the platform."""

    DOCTOR = "doctor"
    HOSPITAL_ADMIN = "hospital_admin"
    RESEARCHER = "researcher"
    SYSTEM_ADMIN = "system_admin"


class Permission(StrEnum):
    """Fine grained capabilities that can be granted to a role."""

    # Patient data
    PATIENT_READ_ASSIGNED = "patient:read_assigned"
    PATIENT_READ_ALL = "patient:read_all"
    PATIENT_READ_ANONYMIZED = "patient:read_anonymized"
    PATIENT_WRITE = "patient:write"
    MEDICAL_HISTORY_READ = "medical_history:read"

    # Risk & readmission
    RISK_REPORT_READ = "risk_report:read"
    RISK_REPORT_READ_AGGREGATED = "risk_report:read_aggregated"
    READMISSION_FORECAST_READ = "readmission_forecast:read"

    # Treatment effectiveness
    TREATMENT_REPORT_READ = "treatment_report:read"
    TREATMENT_REPORT_READ_LIMITED = "treatment_report:read_limited"

    # Clinical decision support
    CARE_RECOMMENDATION_GENERATE = "care_recommendation:generate"

    # Analytics & research
    HOSPITAL_ANALYTICS_READ = "hospital_analytics:read"
    POPULATION_HEALTH_READ = "population_health:read"
    RESEARCH_DATASET_EXPORT = "research_dataset:export"
    ANALYTICS_EXPORT = "analytics:export"

    # Administration
    USER_MANAGE = "user:manage"
    MODEL_MANAGE = "model:manage"
    AUDIT_LOG_READ = "audit_log:read"
    SYSTEM_CONFIGURE = "system:configure"


PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.DOCTOR: frozenset(
        {
            Permission.PATIENT_READ_ASSIGNED,
            Permission.MEDICAL_HISTORY_READ,
            Permission.RISK_REPORT_READ,
            Permission.READMISSION_FORECAST_READ,
            Permission.TREATMENT_REPORT_READ_LIMITED,
            Permission.CARE_RECOMMENDATION_GENERATE,
        }
    ),
    Role.HOSPITAL_ADMIN: frozenset(
        {
            Permission.PATIENT_READ_ALL,
            Permission.RISK_REPORT_READ_AGGREGATED,
            Permission.READMISSION_FORECAST_READ,
            Permission.TREATMENT_REPORT_READ,
            Permission.HOSPITAL_ANALYTICS_READ,
            Permission.ANALYTICS_EXPORT,
        }
    ),
    Role.RESEARCHER: frozenset(
        {
            Permission.PATIENT_READ_ANONYMIZED,
            Permission.RISK_REPORT_READ_AGGREGATED,
            Permission.TREATMENT_REPORT_READ,
            Permission.HOSPITAL_ANALYTICS_READ,
            Permission.POPULATION_HEALTH_READ,
            Permission.RESEARCH_DATASET_EXPORT,
            Permission.ANALYTICS_EXPORT,
        }
    ),
    Role.SYSTEM_ADMIN: frozenset(Permission),
}


def has_permission(role: Role, permission: Permission) -> bool:
    """Return True when the given role is granted the permission."""
    return permission in PERMISSIONS.get(role, frozenset())


def permissions_for(role: Role) -> list[str]:
    """Return a sorted list of permission strings for a role."""
    return sorted(str(p) for p in PERMISSIONS.get(role, frozenset()))
