# backend/migrate_sqlite_to_postgres.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import engine as pg_engine
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome
from app.models.user import User

# Old SQLite source
sqlite_engine = create_engine("sqlite:///./test.db")  # adjust filename if different
SqliteSession = sessionmaker(bind=sqlite_engine)
old_db = SqliteSession()

# New Postgres destination (reads from your current .env automatically)


Base.metadata.create_all(pg_engine)  # ensure tables exist
PgSession = sessionmaker(bind=pg_engine)
new_db = PgSession()

# Copy users (skip duplicates by email)
for u in old_db.query(User).all():
    if not new_db.query(User).filter(User.email == u.email).first():
        new_db.add(
            User(
                email=u.email,
                full_name=u.full_name,
                hashed_password=u.hashed_password,
                role=u.role,
                department=u.department,
                is_active=u.is_active,
            )
        )
new_db.commit()
print("Migrated users")

# Copy patients (skip duplicates by MRN)
old_to_new_patient_id = {}
for p in old_db.query(Patient).all():
    existing = (
        new_db.query(Patient)
        .filter(Patient.medical_record_number == p.medical_record_number)
        .first()
    )
    if existing:
        old_to_new_patient_id[p.id] = existing.id
        continue
    new_p = Patient(
        medical_record_number=p.medical_record_number,
        age_group=p.age_group,
        gender=p.gender,
        primary_diagnosis=p.primary_diagnosis,
        assigned_doctor_id=p.assigned_doctor_id,
    )
    new_db.add(new_p)
    new_db.flush()
    old_to_new_patient_id[p.id] = new_p.id
new_db.commit()
print(f"Migrated {len(old_to_new_patient_id)} patients")

# Copy risk predictions
for r in old_db.query(RiskPrediction).all():
    new_pid = old_to_new_patient_id.get(r.patient_id)
    if new_pid is None:
        continue
    new_db.add(
        RiskPrediction(
            patient_id=new_pid,
            readmission_probability=r.readmission_probability,
            risk_category=r.risk_category,
            model_name=r.model_name,
            model_version=r.model_version,
            created_at=r.created_at,
        )
    )
new_db.commit()
print("Migrated risk predictions")

# Copy treatment outcomes
for t in old_db.query(TreatmentOutcome).all():
    new_pid = old_to_new_patient_id.get(t.patient_id)
    if new_pid is None:
        continue
    new_db.add(
        TreatmentOutcome(
            patient_id=new_pid,
            treatment_type=t.treatment_type,
            outcome_status=t.outcome_status,
            recovery_days=t.recovery_days,
            effectiveness_score=t.effectiveness_score,
            created_at=t.created_at,
        )
    )
new_db.commit()
print("Migrated treatment outcomes")

old_db.close()
new_db.close()
print("Migration complete")
