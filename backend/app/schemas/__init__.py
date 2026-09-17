"""HealthForecast AI Pydantic Schemas."""

from app.schemas.admission import (
    AdmissionBase,
    AdmissionCreate,
    AdmissionResponse,
    AdmissionUpdate,
)
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse
from app.schemas.auth import LoginRequest, RefreshTokenRequest, TokenResponse, UserMeResponse
from app.schemas.dataset import DatasetSummaryResponse
from app.schemas.medical_history import (
    MedicalHistoryBase,
    MedicalHistoryCreate,
    MedicalHistoryResponse,
    MedicalHistoryUpdate,
)
from app.schemas.patient import (
    AnonymizedPatientResponse,
    PatientBase,
    PatientCreate,
    PatientListResponse,
    PatientResponse,
    PatientUpdate,
)
from app.schemas.role import RoleBase, RoleCreate, RoleResponse
from app.schemas.treatment import (
    TreatmentBase,
    TreatmentCreate,
    TreatmentResponse,
    TreatmentUpdate,
)
from app.schemas.user import UserBase, UserCreate, UserListResponse, UserResponse, UserUpdate

__all__ = [
    "LoginRequest",
    "RefreshTokenRequest",
    "TokenResponse",
    "UserMeResponse",
    "RoleBase",
    "RoleCreate",
    "RoleResponse",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "PatientBase",
    "PatientCreate",
    "PatientUpdate",
    "PatientResponse",
    "AnonymizedPatientResponse",
    "PatientListResponse",
    "MedicalHistoryBase",
    "MedicalHistoryCreate",
    "MedicalHistoryUpdate",
    "MedicalHistoryResponse",
    "AdmissionBase",
    "AdmissionCreate",
    "AdmissionUpdate",
    "AdmissionResponse",
    "TreatmentBase",
    "TreatmentCreate",
    "TreatmentUpdate",
    "TreatmentResponse",
    "AssignmentCreate",
    "AssignmentResponse",
    "AuditLogResponse",
    "AuditLogListResponse",
    "DatasetSummaryResponse",
]
