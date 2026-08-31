"""Database seeding script for HealthForecast AI Milestone 1.

Seeds roles, initial users, sample patients, doctor-patient assignments,
medical histories, admissions, treatments, and audit logs.
"""

import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models import (
    Role,
    User,
    Patient,
    DoctorPatientAssignment,
    MedicalHistory,
    Admission,
    Treatment,
    AuditLog,
)
from app.core.security import hash_password


def seed_database():
    """Seed the database with roles and initial demo records."""
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("[*] Seeding Roles...")
        roles_data = [
            ("DOCTOR", "Clinical doctor providing patient diagnosis and medical treatment"),
            ("HOSPITAL_ADMIN", "Hospital administrator overseeing admissions, departments and operations"),
            ("RESEARCHER", "Healthcare researcher analyzing anonymized patient cohorts"),
            ("SYSTEM_ADMIN", "System administrator managing users, roles, security and system health"),
        ]

        roles_by_name = {}
        for role_name, description in roles_data:
            existing_role = db.query(Role).filter(Role.name == role_name).first()
            if not existing_role:
                new_role = Role(id=uuid.uuid4(), name=role_name, description=description)
                db.add(new_role)
                db.flush()
                roles_by_name[role_name] = new_role
                print(f"  + Created role: {role_name}")
            else:
                roles_by_name[role_name] = existing_role
                print(f"  * Role already exists: {role_name}")

        print("[*] Seeding Users...")
        default_password_hash = hash_password("HealthForecast2026!")

        users_data = [
            ("doctor@healthforecast.ai", "dr.smith", "Sarah", "Smith", "DOCTOR"),
            ("doctor2@healthforecast.ai", "dr.johnson", "Robert", "Johnson", "DOCTOR"),
            ("admin@healthforecast.ai", "hosp.admin", "Elena", "Vance", "HOSPITAL_ADMIN"),
            ("researcher@healthforecast.ai", "res.curie", "Marie", "Curie", "RESEARCHER"),
            ("sysadmin@healthforecast.ai", "sysadmin", "Alex", "Mercer", "SYSTEM_ADMIN"),
        ]

        users_by_username = {}
        for email, username, first_name, last_name, role_name in users_data:
            existing_user = db.query(User).filter(User.username == username).first()
            if not existing_user:
                new_user = User(
                    id=uuid.uuid4(),
                    email=email,
                    username=username,
                    password_hash=default_password_hash,
                    first_name=first_name,
                    last_name=last_name,
                    role_id=roles_by_name[role_name].id,
                    is_active=True,
                )
                db.add(new_user)
                db.flush()
                users_by_username[username] = new_user
                print(f"  + Created user: {username} ({role_name})")
            else:
                users_by_username[username] = existing_user
                print(f"  * User already exists: {username}")

        print("[*] Seeding Patients...")
        patients_data = [
            ("PAT-1001", "John", "Doe", date(1968, 5, 12), "Male", "+1-555-0101", "john.doe@example.com", "124 Oak Street, Boston, MA"),
            ("PAT-1002", "Jane", "Miller", date(1975, 11, 23), "Female", "+1-555-0102", "jane.miller@example.com", "456 Elm Avenue, Chicago, IL"),
            ("PAT-1003", "David", "Wilson", date(1952, 3, 15), "Male", "+1-555-0103", "david.w@example.com", "789 Pine Road, Seattle, WA"),
            ("PAT-1004", "Emily", "Davis", date(1983, 8, 30), "Female", "+1-555-0104", "emily.davis@example.com", "321 Cedar Blvd, Austin, TX"),
            ("PAT-1005", "Michael", "Brown", date(1947, 1, 9), "Male", "+1-555-0105", "mbrown@example.com", "654 Birch Court, Denver, CO"),
            ("PAT-1006", "Alice", "Taylor", date(1990, 7, 18), "Female", "+1-555-0106", "alice.t@example.com", "987 Maple Way, Miami, FL"),
        ]

        patients_by_identifier = {}
        for identifier, first, last, dob, gender, phone, email, addr in patients_data:
            existing_p = db.query(Patient).filter(Patient.patient_identifier == identifier).first()
            if not existing_p:
                new_p = Patient(
                    id=uuid.uuid4(),
                    patient_identifier=identifier,
                    first_name=first,
                    last_name=last,
                    date_of_birth=dob,
                    gender=gender,
                    phone=phone,
                    email=email,
                    address=addr,
                )
                db.add(new_p)
                db.flush()
                patients_by_identifier[identifier] = new_p
                print(f"  + Created patient: {identifier} ({first} {last})")
            else:
                patients_by_identifier[identifier] = existing_p

        print("[*] Seeding Doctor-Patient Assignments...")
        doctor1 = users_by_username["dr.smith"]
        doctor2 = users_by_username["dr.johnson"]

        assignments_to_create = [
            (doctor1.id, patients_by_identifier["PAT-1001"].id),
            (doctor1.id, patients_by_identifier["PAT-1002"].id),
            (doctor1.id, patients_by_identifier["PAT-1003"].id),
            (doctor2.id, patients_by_identifier["PAT-1004"].id),
            (doctor2.id, patients_by_identifier["PAT-1005"].id),
        ]

        for doc_id, pat_id in assignments_to_create:
            existing_assign = db.query(DoctorPatientAssignment).filter(
                DoctorPatientAssignment.doctor_id == doc_id,
                DoctorPatientAssignment.patient_id == pat_id,
            ).first()
            if not existing_assign:
                db.add(DoctorPatientAssignment(id=uuid.uuid4(), doctor_id=doc_id, patient_id=pat_id))
                print(f"  + Assigned doctor {doc_id} to patient {pat_id}")

        print("[*] Seeding Medical Histories, Admissions & Treatments...")
        # Sample Medical Histories
        for identifier, p in patients_by_identifier.items():
            existing_mh = db.query(MedicalHistory).filter(MedicalHistory.patient_id == p.id).first()
            if not existing_mh:
                db.add(MedicalHistory(
                    id=uuid.uuid4(),
                    patient_id=p.id,
                    diagnosis="Type 2 Diabetes Mellitus with Hyperglycemia" if identifier in ["PAT-1001", "PAT-1003"] else "Hypertension & Cardiovascular Episode",
                    chronic_conditions="Diabetes Type 2, Chronic Kidney Disease Stage 2",
                    allergies="Penicillin, Sulfa drugs" if identifier == "PAT-1001" else "None known",
                    medical_notes="Patient responds well to glycemic management protocols. Monitoring HbA1c levels regularly.",
                ))

            # Sample Admissions
            existing_adm = db.query(Admission).filter(Admission.patient_id == p.id).first()
            if not existing_adm:
                db.add(Admission(
                    id=uuid.uuid4(),
                    patient_id=p.id,
                    admission_date=date.today() - timedelta(days=14),
                    discharge_date=date.today() - timedelta(days=9),
                    admission_type="Emergency" if identifier in ["PAT-1001", "PAT-1005"] else "Elective",
                    department="Endocrinology" if identifier in ["PAT-1001", "PAT-1003"] else "Cardiology",
                    primary_diagnosis="Diabetes with acute complications (ICD-9 250.02)",
                    length_of_stay=5,
                    discharge_disposition="Discharged to Home with Home Health Service",
                ))

            # Sample Treatments
            existing_tx = db.query(Treatment).filter(Treatment.patient_id == p.id).first()
            if not existing_tx:
                db.add(Treatment(
                    id=uuid.uuid4(),
                    patient_id=p.id,
                    treatment_name="Metformin 1000mg BID + Insulin Glargine 20u QHS",
                    treatment_type="Pharmacotherapy",
                    start_date=date.today() - timedelta(days=12),
                    end_date=None,
                    status="ACTIVE",
                    notes="Titrate insulin dose based on fasting blood glucose logs.",
                ))

        print("[*] Seeding Audit Logs...")
        sysadmin = users_by_username["sysadmin"]
        existing_log = db.query(AuditLog).first()
        if not existing_log:
            db.add(AuditLog(
                id=uuid.uuid4(),
                user_id=sysadmin.id,
                action="SYSTEM_INIT",
                resource="SYSTEM",
                resource_id="INITIAL_SETUP",
                created_at=datetime.now(timezone.utc),
            ))

        db.commit()
        print("[SUCCESS] Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
