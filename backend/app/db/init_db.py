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
from datetime import date, timedelta

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
from app.services.treatment_service import recovery_index

SEED_USERS: tuple[tuple[str, str, Role, str | None], ...] = (
    ("admin@healthforecast.org", "System Administrator", Role.SYSTEM_ADMIN, "IT"),
    ("dr.reddy@healthforecast.org", "Dr Anitha Reddy", Role.DOCTOR, "Endocrinology"),
    ("dr.mehta@healthforecast.org", "Dr Sanjay Mehta", Role.DOCTOR, "Internal Medicine"),
    ("admin.ops@healthforecast.org", "Hospital Administrator", Role.HOSPITAL_ADMIN, "Operations"),
    ("researcher@healthforecast.org", "Healthcare Researcher", Role.RESEARCHER, "Research"),
)

# Size of the demo clinical cohort.
SEED_COHORT_SIZE = 60

# Admissions are spread over the six months before this date so time-based
# analytics have a range to work with.
SEED_ADMISSION_START = date(2025, 10, 1)

AGE_GROUPS: tuple[str, ...] = ("[40-50)", "[50-60)", "[60-70)", "[70-80)", "[80-90)")
RACES: tuple[str, ...] = ("Caucasian", "AfricanAmerican", "Hispanic", "Other")

# Diagnosis label -> the protocols plausibly used for it. Labels match the ICD-9
# chapter groups the ETL writes into patients.primary_diagnosis, so the same
# analytics code reads correctly against either the seed or the real dataset.
SEED_COHORT: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "Diabetes",
        (
            "Metformin Monotherapy",
            "Insulin Intensive Therapy",
            "GLP-1 Receptor Agonist",
            "SGLT2 Inhibitor Protocol",
        ),
    ),
    (
        "Circulatory",
        ("Beta Blocker Titration", "Furosemide IV Protocol", "ACE Inhibitor Protocol"),
    ),
    (
        "Respiratory",
        ("Nebulized Bronchodilators", "Systemic Corticosteroid Course", "Antibiotic Protocol"),
    ),
    ("Genitourinary", ("Renal Dose Adjustment Protocol", "Fluid Resuscitation Pathway")),
    ("Digestive", ("Conservative Management", "Laparoscopic Excision")),
)

# Must stay in step with treatment_service.ROUTINE_HOME_DISCHARGES: these are
# the episodes that resolved, and only these.
ROUTINE_DISCHARGES: tuple[str, ...] = (
    "Discharged to home",
    "Discharged/transferred to home with home health service",
    "Discharged/transferred to home under care of Home IV provider",
)

# Anything outside the routine set counts as an unresolved episode, which is
# what the dashboard reports as a complication. Labels are the dataset's own.
COMPLICATED_DISCHARGES: tuple[str, ...] = (
    "Discharged/transferred to SNF",
    "Discharged/transferred to another short term hospital",
    "Discharged/transferred to another rehab fac including rehab units of a hospital",
)

# Roughly one patient in eleven is readmitted and one in nine leaves somewhere
# other than home. The cycles are deliberately coprime with every other stride in
# the seed (5 diagnosis groups, 2 doctors, up to 4 protocols per group) and offset
# from zero - aligned strides manufacture degenerate slices under a deterministic
# seed, such as a whole diagnosis group readmitting 100% of its patients.
READMIT_PERIOD, READMIT_OFFSET = 11, 4
COMPLICATION_PERIOD, COMPLICATION_OFFSET = 9, 5


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
                # role=role,
                department=department,
                password=password,
            ),
        )
        created.append(user)
        logger.info("Created %s (%s)", user.email, user.role)

    return created


def seed_sample_clinical_data(db: Session) -> None:
    """Seed a demo cohort: patients, admissions and treatment outcomes.

    The Milestone 3 analytics endpoints aggregate real SQL over these tables and
    deliberately have no fallback figures, so without a cohort here the treatment
    dashboard renders empty. Load the full dataset with `python -m src.data.etl`
    for anything you intend to reason about clinically; this seed exists so the
    platform is demoable on a laptop with no dataset and no Postgres.

    Deterministic by design - no RNG - so the numbers are the same on every
    machine and the tests can assert against them.
    """
    if db.query(Patient).count() > 0:
        logger.info("Patients already exist in DB, skipping clinical seed.")
        return

    doctors = db.query(User).filter(User.role == Role.DOCTOR).all()
    if not doctors:
        logger.warning("No doctors seeded; patients will be unassigned.")

    for index in range(SEED_COHORT_SIZE):
        diagnosis, protocols = SEED_COHORT[index % len(SEED_COHORT)]
        doctor = doctors[index % len(doctors)] if doctors else None

        patient = Patient(
            medical_record_number=f"MRN-{2000 + index}",
            gender="Female" if index % 2 == 0 else "Male",
            age_group=AGE_GROUPS[index % len(AGE_GROUPS)],
            race=RACES[index % len(RACES)],
            primary_diagnosis=diagnosis,
            assigned_doctor_id=doctor.id if doctor else None,
        )
        db.add(patient)
        db.flush()

        length_of_stay = 1 + (index % 10)
        number_diagnoses = 3 + (index % 7)
        num_medications = 5 + (index * 3) % 20
        readmitted = "<30" if index % READMIT_PERIOD == READMIT_OFFSET else "NO"
        complicated = index % COMPLICATION_PERIOD == COMPLICATION_OFFSET

        admission_date = SEED_ADMISSION_START + timedelta(days=index % 180)
        admission = Admission(
            patient_id=patient.id,
            admission_date=admission_date,
            discharge_date=admission_date + timedelta(days=length_of_stay),
            time_in_hospital=length_of_stay,
            admission_type="Emergency" if index % 3 else "Elective",
            discharge_disposition=(
                COMPLICATED_DISCHARGES[index % len(COMPLICATED_DISCHARGES)]
                if complicated
                else ROUTINE_DISCHARGES[index % len(ROUTINE_DISCHARGES)]
            ),
            num_medications=num_medications,
            num_lab_procedures=20 + (index * 5) % 70,
            number_diagnoses=number_diagnoses,
            readmitted=readmitted,
        )
        db.add(admission)
        db.flush()

        recovery_score = recovery_index(
            length_of_stay=length_of_stay,
            number_diagnoses=number_diagnoses,
            num_medications=num_medications,
            readmitted=readmitted,
        )
        db.add(
            TreatmentOutcome(
                admission_id=admission.id,
                treatment_name=protocols[index % len(protocols)],
                medication_change=index % 2 == 0,
                recovery_score=recovery_score,
                length_of_stay_days=length_of_stay,
                outcome=(
                    "Readmitted <30d"
                    if readmitted == "<30"
                    else "Transferred to continuing care" if complicated else "Recovered"
                ),
            )
        )

    db.commit()
    logger.info(
        "Seeded %s patients with one admission and treatment outcome each.",
        SEED_COHORT_SIZE,
    )


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
