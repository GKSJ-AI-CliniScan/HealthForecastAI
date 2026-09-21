"""Create the schema and seed the demo accounts.

Milestone 1. Run once against an empty database:

    python -m app.db.init_db

Passwords come from SEED_PASSWORD, or are generated and printed if it is not
set. They are demo accounts for a development database - never run this against
anything real, and never commit the password it prints.
"""

from __future__ import annotations

import os
import secrets
import sys

from sqlalchemy.orm import Session

from app.core.logging_config import logger
from app.core.rbac import Role
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import (  # noqa: F401  - imported so Base.metadata knows every table
    Admission,
    AuditLog,
    Patient,
    RiskPrediction,
    TreatmentOutcome,
    User,
)
from app.schemas.user import UserCreate
from app.services import auth_service

SEED_USERS: tuple[tuple[str, str, Role, str | None], ...] = (
    ("admin@healthforecast.org", "System Administrator", Role.SYSTEM_ADMIN, "IT"),
    ("dr.reddy@healthforecast.org", "Dr Anitha Reddy", Role.DOCTOR, "Endocrinology"),
    ("dr.mehta@healthforecast.org", "Dr Sanjay Mehta", Role.DOCTOR, "Internal Medicine"),
    ("admin.ops@healthforecast.org", "Hospital Administrator", Role.HOSPITAL_ADMIN, "Operations"),
    ("researcher@healthforecast.org", "Healthcare Researcher", Role.RESEARCHER, "Research"),
)


def create_schema() -> None:
    """Create every table that does not already exist."""
    Base.metadata.create_all(bind=engine)
    logger.info("Schema ready: %s", ", ".join(sorted(Base.metadata.tables)))


def seed_users(db: Session, password: str) -> list[User]:
    """Create the demo accounts, skipping any that already exist."""
    created: list[User] = []

    for email, full_name, role, department in SEED_USERS:
        if auth_service.get_user_by_email(db, email) is not None:
            logger.info("User already exists, skipping: %s", email)
            continue

        user = auth_service.create_user(
            db,
            UserCreate(
                email=email,
                full_name=full_name,
                role=role,
                department=department,
                password=password,
            ),
        )
        created.append(user)
        logger.info("Created %s (%s)", user.email, user.role)

    return created


def seed_sample_clinical_data(db: Session) -> None:
    """Seed sample patients, admissions, and treatment outcomes if empty."""
    if db.query(Patient).count() > 0:
        logger.info("Patients already exist in DB, skipping clinical seed.")
        return

    doctors = db.query(User).filter(User.role == Role.DOCTOR).all()
    doc_id = doctors[0].id if doctors else None

    # Sample treatment options
    treatments = [
        "Insulin Intensive Therapy",
        "Metformin Monotherapy",
        "Dual Therapy (Sulfonylurea + Metformin)",
        "GLP-1 Receptor Agonist",
        "SGLT2 Inhibitor Protocol",
    ]

    sample_patients = [
        ("MRN-1001", "Female", "[60-70)", "Caucasian", "Diabetes Mellitus Type 2"),
        ("MRN-1002", "Male", "[70-80)", "AfricanAmerican", "Circulatory System Disease"),
        ("MRN-1003", "Female", "[50-60)", "Caucasian", "Respiratory System Disease"),
        ("MRN-1004", "Male", "[80-90)", "Hispanic", "Metabolic Disorder"),
        ("MRN-1005", "Female", "[40-50)", "Caucasian", "Digestive System Disease"),
    ]

    for i, (mrn, gender, age_group, race, diag) in enumerate(sample_patients):
        patient = Patient(
            medical_record_number=mrn,
            gender=gender,
            age_group=age_group,
            race=race,
            primary_diagnosis=diag,
            assigned_doctor_id=doc_id,
        )
        db.add(patient)
        db.flush()

        # Create admissions for patient
        readmitted_status = "<30" if i % 2 == 0 else "NO"
        adm = Admission(
            patient_id=patient.id,
            admission_type="Emergency" if i % 2 == 0 else "Elective",
            time_in_hospital=3 + i * 2,
            num_medications=12 + i * 3,
            num_lab_procedures=42 + i * 5,
            number_diagnoses=7 + i,
            discharge_disposition="Discharged to home",
            readmitted=readmitted_status,
        )
        db.add(adm)
        db.flush()

        # Create treatment outcome
        treatment_name = treatments[i % len(treatments)]
        recovery_score = round(70.0 + (i * 5.5) - (15.0 if readmitted_status == "<30" else 0.0), 1)
        outcome_status = "Readmitted <30d" if readmitted_status == "<30" else "Recovered"
        
        outcome = TreatmentOutcome(
            admission_id=adm.id,
            treatment_name=treatment_name,
            medication_change=True if i % 2 == 0 else False,
            recovery_score=min(100.0, max(30.0, recovery_score)),
            length_of_stay_days=adm.time_in_hospital,
            outcome=outcome_status,
        )
        db.add(outcome)

    db.commit()
    logger.info("Seeded sample patients, admissions, and treatment outcomes.")


def main() -> int:
    """Create the schema and seed the demo accounts."""
    password = os.environ.get("SEED_PASSWORD")
    generated = password is None
    if generated:
        password = secrets.token_urlsafe(16)

    create_schema()

    with SessionLocal() as db:
        # Read the values inside the session: the ORM objects are detached once
        # it closes, and touching an attribute then raises.
        created = [(user.role, user.email) for user in seed_users(db, password)]
        seed_sample_clinical_data(db)

    if not created:
        print("Nothing to seed - every demo account already exists.")
        return 0

    print(f"\nCreated {len(created)} account(s):\n")
    for role, email in created:
        print(f"  {role:16} {email}")

    if generated:
        print(f"\nGenerated password for all seeded accounts: {password}")
        print("Set SEED_PASSWORD to choose your own. Do not commit this value.\n")
    else:
        print("\nUsing the password from SEED_PASSWORD.\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
