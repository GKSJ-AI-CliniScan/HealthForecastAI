from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.admission import Admission
from app.models.prediction import RiskPrediction
from app.services.risk_service import evaluate_patient_risk
from app.core.config import settings


BATCH_SIZE = 1000


def seed_risk_predictions():
    db: Session = SessionLocal()

    try:
        existing = db.query(RiskPrediction).count()

        if existing > 0:
            print(f"Risk predictions already exist: {existing}")
            print("Nothing was inserted.")
            return

        total = db.query(Admission).count()
        print(f"Admissions to process: {total}")

        offset = 0
        inserted = 0

        while offset < total:
            admissions = (
                db.query(Admission)
                .order_by(Admission.id)
                .offset(offset)
                .limit(BATCH_SIZE)
                .all()
            )

            if not admissions:
                break

            predictions = []

            for admission in admissions:
                data = {
                    "time_in_hospital": admission.time_in_hospital,
                    "num_medications": admission.num_medications,
                    "number_diagnoses": admission.number_diagnoses,
                    "number_inpatient": admission.number_inpatient,
                    "number_emergency": admission.number_emergency,
                    "A1Cresult": admission.A1Cresult,
                }

                evaluation = evaluate_patient_risk(data)

                predictions.append(
                    RiskPrediction(
                        patient_id=admission.patient_id,
                        admission_id=admission.id,
                        readmission_probability=evaluation["readmission_probability"],
                        risk_category=evaluation["risk_category"],
                        model_name=getattr(
                            settings,
                            "ACTIVE_RISK_MODEL",
                            "diabetes_readmission_xgb",
                        ),
                        model_version="1.0.0",
                    )
                )

            db.add_all(predictions)
            db.commit()

            inserted += len(predictions)
            offset += len(admissions)

            print(f"Processed {inserted}/{total}")

        print(f"\nCompleted. Inserted {inserted} risk predictions.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_risk_predictions()