"""Patient data management endpoints - Module 2."""

import hashlib
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.schemas.patient import PatientCreate, PatientRead

router = APIRouter()

# Seed cohort for demonstration and research analytics
SAMPLE_PATIENT_RECORDS = [
    {
        "mrn": "MRN-902184",
        "age_group": "[60-70)",
        "gender": "Female",
        "race": "Caucasian",
        "primary_diagnosis": "Diabetes Mellitus with renal manifestations (250.4)",
        "admission_type": "Emergency",
        "risk_category": "HIGH",
        "readmitted": "<30",
    },
    {
        "mrn": "MRN-847291",
        "age_group": "[70-80)",
        "gender": "Male",
        "race": "AfricanAmerican",
        "primary_diagnosis": "Congestive Heart Failure (428.0)",
        "admission_type": "Emergency",
        "risk_category": "HIGH",
        "readmitted": "<30",
    },
    {
        "mrn": "MRN-736192",
        "age_group": "[50-60)",
        "gender": "Female",
        "race": "Caucasian",
        "primary_diagnosis": "Chronic Obstructive Pulmonary Disease (496)",
        "admission_type": "Urgent",
        "risk_category": "MEDIUM",
        "readmitted": "NO",
    },
    {
        "mrn": "MRN-625184",
        "age_group": "[40-50)",
        "gender": "Male",
        "race": "Hispanic",
        "primary_diagnosis": "Essential Hypertension (401.9)",
        "admission_type": "Elective",
        "risk_category": "LOW",
        "readmitted": "NO",
    },
    {
        "mrn": "MRN-514293",
        "age_group": "[60-70)",
        "gender": "Male",
        "race": "Other",
        "primary_diagnosis": "Acute Myocardial Infarction (410.9)",
        "admission_type": "Emergency",
        "risk_category": "MEDIUM",
        "readmitted": ">30",
    },
]


def _pseudonymize(identifier: str) -> str:
    """Generate a one-way deterministic pseudonymized token for research use."""
    token = hashlib.sha256(identifier.encode("utf-8")).hexdigest()[:10].upper()
    return f"RES-{token}"


@router.get("", response_model=list[PatientRead], summary="List patients visible to the caller")
def list_patients(user: CurrentUser = Depends(get_current_user)) -> list[PatientRead]:
    """Return the patients the caller is allowed to see.

    Scope rules from the access matrix:
      - doctor          -> only patients assigned to them
      - hospital_admin  -> hospital wide, read only
      - researcher      -> anonymised records only (blocked from direct records)
      - system_admin    -> everything
    """
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )
    return []


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a patient record."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Patient creation is reserved for clinical intake systems",
    )


@router.get("/anonymised", summary="Anonymised patient cohort for researchers")
def list_anonymised_patients(
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
) -> list[dict[str, Any]]:
    """Return a de-identified cohort with pseudonymized research IDs and no direct PII."""
    return [
        {
            "research_id": _pseudonymize(record["mrn"]),
            "age_group": record["age_group"],
            "gender": record["gender"],
            "race": record["race"],
            "primary_diagnosis": record["primary_diagnosis"],
            "admission_type": record["admission_type"],
            "risk_category": record["risk_category"],
            "readmitted": record["readmitted"],
        }
        for record in SAMPLE_PATIENT_RECORDS
    ]
