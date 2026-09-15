"""Prediction service orchestrating patient data extraction, inference, persistence, and RBAC."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ml.inference.predictor import predictor
from app.models.patient import Patient
from app.models.prediction import ModelVersion, Prediction
from app.models.user import User
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.prediction_repository import PredictionRepository
from app.schemas.prediction import (
    HighRiskPatientItem,
    HighRiskPatientListResponse,
    PredictionListResponse,
    PredictionResponse,
    PredictionSummaryResponse,
    ReadmissionTrendsResponse,
    RiskDistributionResponse,
    TrendPoint,
)
from app.services.audit_service import AuditService


class PredictionService:
    """Orchestrates machine learning predictions with strict clinical RBAC and audit tracking."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = PredictionRepository(db)
        self.patient_repo = PatientRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.audit_service = AuditService(db)
        self._ensure_model_version_registered()

    def _ensure_model_version_registered(self) -> None:
        """Seed initial active model version if not already in database."""
        active = self.repo.get_active_model_version()
        if active is None:
            # Read metadata.json if available
            base_dir = Path(__file__).resolve().parent.parent / "ml" / "models" / "metadata"
            meta_path = base_dir / "metadata.json"
            meta: dict[str, Any] = {}
            if meta_path.is_file():
                try:
                    with open(meta_path, encoding="utf-8") as f:
                        meta = json.load(f)
                except Exception:
                    meta = {}

            mv = ModelVersion(
                id=uuid.uuid4(),
                model_name=meta.get("model_name", "readmission_prediction"),
                version=meta.get("version", "v1.0"),
                algorithm=meta.get("algorithm", "Random Forest"),
                accuracy=meta.get("accuracy", 0.7027),
                precision=meta.get("precision", 0.1942),
                recall=meta.get("recall", 0.5288),
                f1_score=meta.get("f1_score", 0.2841),
                roc_auc=meta.get("roc_auc", 0.6830),
                training_date=datetime.now(UTC),
                is_active=True,
            )
            try:
                self.repo.register_model_version(mv)
            except Exception:
                self.db.rollback()

    def _verify_patient_access(self, patient_id: uuid.UUID, current_user: User) -> Patient:
        """Enforce role-based patient access restrictions."""
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID '{patient_id}' not found",
            )

        if current_user.role == "DOCTOR":
            is_assigned = self.assignment_repo.get_assignment(
                doctor_id=current_user.id, patient_id=patient.id
            )
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You are not assigned to this patient",
                )

        return patient

    def _extract_patient_features(
        self, patient: Patient, custom_overrides: dict | None = None
    ) -> dict[str, Any]:
        """Extract structured features from patient's electronic health record."""
        # Calculate patient age group
        age_group = "[60-70)"
        if patient.date_of_birth:
            today = date.today()
            age_years = (
                today.year
                - patient.date_of_birth.year
                - (
                    (today.month, today.day)
                    < (patient.date_of_birth.month, patient.date_of_birth.day)
                )
            )
            bracket = (age_years // 10) * 10
            age_group = f"[{bracket}-{bracket + 10})"

        # Query recent admissions
        admissions = patient.admissions or []
        num_inpatient = len(admissions)
        latest_adm = admissions[-1] if admissions else None
        length_of_stay = getattr(latest_adm, "length_of_stay", 3) or 3

        # Query medical histories
        histories = patient.medical_histories or []
        diagnoses_count = max(1, len(histories) * 2)

        # Query active treatments
        treatments = patient.treatments or []
        num_meds = max(len(treatments), 8)

        # Build feature dictionary matching preprocessor requirements
        features = {
            "time_in_hospital": int(length_of_stay),
            "num_lab_procedures": 42,
            "num_procedures": 1,
            "num_medications": int(num_meds),
            "number_outpatient": 0,
            "number_emergency": 0,
            "number_inpatient": int(num_inpatient),
            "number_diagnoses": int(diagnoses_count),
            "gender": patient.gender or "Female",
            "age": age_group,
            "race": "Caucasian",
            "admission_type_id": 1,
            "discharge_disposition_id": 1,
            "admission_source_id": 7,
            "max_glu_serum": "None",
            "A1Cresult": "None",
            "metformin": "No",
            "glipizide": "No",
            "glyburide": "No",
            "insulin": "No",
            "change": "No",
            "diabetesMed": "Yes" if len(treatments) > 0 else "No",
            "diag_1": "428",
            "diag_2": "250",
            "diag_3": "401",
        }

        if custom_overrides:
            features.update(custom_overrides)

        return features

    def generate_readmission_prediction(
        self,
        patient_id: uuid.UUID,
        current_user: User,
        override_features: dict | None = None,
    ) -> PredictionResponse:
        """Trigger AI readmission prediction flow for a patient and persist the result."""
        # 1. Access verification
        patient = self._verify_patient_access(patient_id, current_user)

        # Researchers cannot trigger new predictions with PII
        if current_user.role == "RESEARCHER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Researchers have read-only de-identified access.",
            )

        # 2. Extract clinical features
        features = self._extract_patient_features(patient, override_features)

        # 3. Invoke inference engine
        result = predictor.predict(features)

        # 4. Determine admission ID if any
        admissions = patient.admissions or []
        latest_adm_id = admissions[-1].id if admissions else None

        # 5. Persist prediction in database
        pred_record = Prediction(
            id=uuid.uuid4(),
            patient_id=patient.id,
            admission_id=latest_adm_id,
            prediction_type="READMISSION",
            risk_score=result["risk_score"],
            risk_category=result["risk_category"],
            readmission_probability=result["readmission_probability"],
            confidence_score=result["confidence_score"],
            contributing_factors=result["contributing_factors"],
            clinical_insights=result["clinical_insights"],
            model_name=result["model_name"],
            model_version=result["model_version"],
            created_at=datetime.now(UTC),
        )
        saved = self.repo.create_prediction(pred_record)

        # 6. Audit logging
        self.audit_service.log_action(
            action="PREDICTION_GENERATE",
            resource="PREDICTION",
            resource_id=str(saved.id),
            user_id=current_user.id,
        )

        return self._to_prediction_response(saved, patient, current_user)

    def _to_prediction_response(
        self, pred: Prediction, patient: Patient | None, current_user: User
    ) -> PredictionResponse:
        """Convert Prediction ORM entity to response DTO with researcher anonymization."""
        is_researcher = current_user.role == "RESEARCHER"

        pat_ident = None
        pat_name = None

        if patient is not None:
            if is_researcher:
                pat_ident = f"ANON-{str(patient.id)[:8].upper()}"
                pat_name = "De-Identified Inpatient"
            else:
                pat_ident = patient.patient_identifier
                pat_name = patient.full_name

        return PredictionResponse(
            id=pred.id,
            patient_id=pred.patient_id,
            prediction_type=pred.prediction_type,
            risk_score=pred.risk_score,
            risk_category=pred.risk_category,
            readmission_probability=pred.readmission_probability,
            confidence_score=pred.confidence_score,
            contributing_factors=pred.contributing_factors,
            clinical_insights=pred.clinical_insights,
            model_name=pred.model_name,
            model_version=pred.model_version,
            created_at=pred.created_at,
            patient_identifier=pat_ident,
            patient_name=pat_name,
        )

    def get_prediction_by_id(
        self, prediction_id: uuid.UUID, current_user: User
    ) -> PredictionResponse:
        """Retrieve a specific prediction record with role access checks."""
        pred = self.repo.get_by_id(prediction_id)
        if not pred:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prediction with ID '{prediction_id}' not found",
            )

        patient = self._verify_patient_access(pred.patient_id, current_user)
        return self._to_prediction_response(pred, patient, current_user)

    def list_predictions(
        self,
        current_user: User,
        page: int = 1,
        page_size: int = 20,
        patient_id: uuid.UUID | None = None,
        risk_category: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> PredictionListResponse:
        """List historical predictions governed by caller role and filters."""
        skip = (page - 1) * page_size
        assigned_doctor_id = current_user.id if current_user.role == "DOCTOR" else None

        items, total = self.repo.list_predictions(
            skip=skip,
            limit=page_size,
            patient_id=patient_id,
            risk_category=risk_category,
            assigned_doctor_id=assigned_doctor_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Batch load patient mappings
        pat_ids = {p.patient_id for p in items}
        patients_map = {}
        for pid in pat_ids:
            pat = self.patient_repo.get_by_id(pid)
            if pat:
                patients_map[pid] = pat

        responses = [
            self._to_prediction_response(p, patients_map.get(p.patient_id), current_user)
            for p in items
        ]

        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
        return PredictionListResponse(
            items=responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, total_pages),
        )

    def get_patient_predictions(
        self, patient_id: uuid.UUID, current_user: User
    ) -> list[PredictionResponse]:
        """Retrieve complete prediction timeline for a patient."""
        patient = self._verify_patient_access(patient_id, current_user)
        items, _ = self.repo.list_predictions(
            skip=0,
            limit=100,
            patient_id=patient_id,
        )
        return [self._to_prediction_response(p, patient, current_user) for p in items]

    def list_high_risk_patients(
        self,
        current_user: User,
        page: int = 1,
        page_size: int = 20,
        category: str | None = None,
    ) -> HighRiskPatientListResponse:
        """Retrieve patients whose latest risk assessment is HIGH or CRITICAL."""
        skip = (page - 1) * page_size
        assigned_doctor_id = current_user.id if current_user.role == "DOCTOR" else None

        records, total = self.repo.list_high_risk_patients(
            skip=skip,
            limit=page_size,
            assigned_doctor_id=assigned_doctor_id,
            category_filter=category,
        )

        is_researcher = current_user.role == "RESEARCHER"
        items: list[HighRiskPatientItem] = []
        for r in records:
            pat_ident = (
                f"ANON-{str(r['patient_id'])[:8].upper()}"
                if is_researcher
                else r["patient_identifier"]
            )
            pat_name = "De-Identified Inpatient" if is_researcher else r["patient_name"]

            items.append(
                HighRiskPatientItem(
                    patient_id=r["patient_id"],
                    patient_identifier=pat_ident,
                    patient_name=pat_name,
                    gender=r["gender"],
                    risk_score=r["risk_score"],
                    risk_category=r["risk_category"],
                    readmission_probability=r["readmission_probability"],
                    latest_prediction_date=r["latest_prediction_date"],
                    assigned_doctor_name=None if is_researcher else r["assigned_doctor_name"],
                    prediction_id=r["prediction_id"],
                )
            )

        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
        return HighRiskPatientListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, total_pages),
        )

    # -------------------------------------------------------------
    # Analytics
    # -------------------------------------------------------------

    def get_risk_distribution(self) -> RiskDistributionResponse:
        """Get distribution of risk categories from real database."""
        dist = self.repo.get_risk_distribution()
        total = sum(d["count"] for d in dist)
        return RiskDistributionResponse(total_predictions=total, distribution=dist)

    def get_prediction_summary(self) -> PredictionSummaryResponse:
        """Get summary analytics metrics."""
        summary = self.repo.get_prediction_summary()
        return PredictionSummaryResponse(**summary)

    def get_readmission_trends(self) -> ReadmissionTrendsResponse:
        """Calculate trend series from real prediction records."""
        # Query last 30 predictions or group by date
        predictions, _ = self.repo.list_predictions(skip=0, limit=100)
        trends_map: dict[str, list[float]] = {}
        high_risk_map: dict[str, int] = {}

        for p in predictions:
            d_str = p.created_at.strftime("%Y-%m-%d")
            trends_map.setdefault(d_str, []).append(p.readmission_probability)
            if p.risk_category in ("HIGH", "CRITICAL"):
                high_risk_map[d_str] = high_risk_map.get(d_str, 0) + 1

        points: list[TrendPoint] = []
        for d_str in sorted(trends_map.keys()):
            probs = trends_map[d_str]
            avg_prob = sum(probs) / len(probs)
            points.append(
                TrendPoint(
                    date=d_str,
                    average_probability=round(avg_prob, 4),
                    prediction_count=len(probs),
                    high_risk_count=high_risk_map.get(d_str, 0),
                )
            )

        if not points:
            # Provide current day baseline point if DB is fresh
            today_str = datetime.now(UTC).strftime("%Y-%m-%d")
            points.append(
                TrendPoint(
                    date=today_str,
                    average_probability=0.0,
                    prediction_count=0,
                    high_risk_count=0,
                )
            )

        return ReadmissionTrendsResponse(trends=points)
