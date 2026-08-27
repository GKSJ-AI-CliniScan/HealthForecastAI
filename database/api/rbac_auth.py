# Authentication and RBAC Roles Definition
from enum import Enum

class UserRole(str, Enum):
    DOCTOR = "Doctor"
    HOSPITAL_ADMIN = "Hospital Administrator"
    RESEARCHER = "Healthcare Researcher"
    SYSTEM_ADMIN = "System Administrator"

def verify_user_access(role: UserRole, required_role: UserRole) -> bool:
    """Simple role validation placeholder for Milestone 1/2 transition."""
    return role == required_role or role == UserRole.SYSTEM_ADMIN
