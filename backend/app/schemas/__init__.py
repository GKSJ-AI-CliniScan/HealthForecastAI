"""HealthForecast AI Pydantic Schemas."""

from app.schemas.auth import LoginRequest, RefreshTokenRequest, TokenResponse, UserMeResponse
from app.schemas.role import RoleBase, RoleCreate, RoleResponse
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserResponse, UserListResponse
from app.schemas.patient import (
    PatientBase,
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    AnonymizedPatientResponse,
    PatientListResponse,
)
from app.schemas.medical_history import (
    MedicalHistoryBase,
    MedicalHistoryCreate,
    MedicalHistoryUpdate,
    MedicalHistoryResponse,
)
from app.schemas.admission import (
    AdmissionBase,
    AdmissionCreate,
    AdmissionUpdate,
    AdmissionResponse,
)
from app.schemas.treatment import (
    TreatmentBase,
    TreatmentCreate,
    TreatmentUpdate,
    TreatmentResponse,
)
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.schemas.audit_log import AuditLogResponse, AuditLogListResponse
from app.schemas.dataset import DatasetSummaryResponse

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
