"""Database seeding script for demo and review."""

from datetime import date

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.auth_service import create_user


def seed_database(db: Session) -> None:
    """Populate database with default users, patients, admissions, predictions, and treatments."""
    print("Seeding users...")
    users = [
        UserCreate(
            email="samarth@healthforecast.ai",
            full_name="Samarth A C",
            password="password123",
            role="system_admin",
            department="Administration",
        ),
        UserCreate(
            email="doctor@healthforecast.ai",
            full_name="Dr. Sarah Smith",
            password="password123",
            role="doctor",
            department="Cardiology",
        ),
        UserCreate(
            email="admin@hospital.org",
            full_name="Hospital Director",
            password="password123",
            role="hospital_admin",
            department="Executive",
        ),
        UserCreate(
            email="researcher@lab.org",
            full_name="Data Researcher",
            password="password123",
            role="researcher",
            department="Analytics",
        ),
    ]

    for u in users:
        existing = db.query(User).filter(User.email == u.email).first()
        if not existing:
            create_user(db, u)

    print("Seeding patients and admissions...")
    doctor = db.query(User).filter(User.role == "doctor").first()

    patient_data = [
        ("MRN-1001", "[60-70)", "Male", "Caucasian", "Diabetes"),
        ("MRN-1002", "[50-60)", "Female", "AfricanAmerican", "Circulatory"),
        ("MRN-1003", "[70-80)", "Male", "Caucasian", "Respiratory"),
    ]

    for mrn, age, gender, race, diag in patient_data:
        p = db.query(Patient).filter(Patient.medical_record_number == mrn).first()
        if not p:
            p = Patient(
                medical_record_number=mrn,
                age_group=age,
                gender=gender,
                race=race,
                primary_diagnosis=diag,
                assigned_doctor_id=doctor.id if doctor else None,
            )
            db.add(p)
            db.commit()
            db.refresh(p)

            adm = Admission(
                patient_id=p.id,
                admission_date=date(2024, 1, 10),
                discharge_date=date(2024, 1, 15),
                time_in_hospital=5,
                admission_type="Emergency",
                discharge_disposition="Discharged to home",
                num_medications=14,
                num_lab_procedures=45,
                number_diagnoses=8,
                readmitted="NO",
            )
            db.add(adm)
            db.commit()
            db.refresh(adm)

            # Add prediction
            pred = RiskPrediction(
                patient_id=p.id,
                admission_id=adm.id,
                readmission_probability=0.0894,
                risk_category="low",
                model_name="readmission_xgboost_v1",
                model_version="1.0.0",
            )
            db.add(pred)

            # Add treatment outcome
            treat = TreatmentOutcome(
                admission_id=adm.id,
                treatment_name="Insulin Regimen" if mrn == "MRN-1001" else "Metformin Protocol",
                medication_change=True,
                recovery_score=85.0 if mrn == "MRN-1001" else 78.5,
                length_of_stay_days=5,
                outcome="Recovered" if mrn == "MRN-1001" else "Stable",
            )
            db.add(treat)
            db.commit()

    print("✅ Database seeding completed successfully!")


def main() -> None:
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
