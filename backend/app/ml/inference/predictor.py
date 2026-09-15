"""Clinical inference engine serving readmission risk predictions."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

from app.ml.data.validator import sanitize_input_row
from app.ml.inference.risk_engine import risk_engine
from app.ml.preprocessing.preprocessing import ClinicalDataPreprocessor


class ReadmissionPredictor:
    """In-memory singleton inference service for fast hospital readmission predictions."""

    _instance: ReadmissionPredictor | None = None

    def __init__(self):
        self.model = None
        self.preprocessor: ClinicalDataPreprocessor | None = None
        self.metadata: dict = {}
        self.is_loaded = False
        self._load_artifacts()

    @classmethod
    def get_instance(cls) -> ReadmissionPredictor:
        """Get or initialize the predictor singleton."""
        if cls._instance is None:
            cls._instance = ReadmissionPredictor()
        return cls._instance

    def _load_artifacts(self) -> None:
        """Load serialized model, preprocessor, and metadata into memory once."""
        base_dir = Path(__file__).resolve().parent.parent
        saved_dir = base_dir / "models" / "saved"
        meta_dir = base_dir / "models" / "metadata"

        model_path = saved_dir / "readmission_model_v1.joblib"
        preprocessor_path = saved_dir / "preprocessor_v1.joblib"
        meta_path = meta_dir / "metadata.json"

        if model_path.is_file() and preprocessor_path.is_file():
            try:
                self.model = joblib.load(model_path)
                self.preprocessor = ClinicalDataPreprocessor.load(preprocessor_path)
                if meta_path.is_file():
                    with open(meta_path, encoding="utf-8") as f:
                        self.metadata = json.load(f)
                else:
                    self.metadata = {
                        "model_name": "readmission_prediction",
                        "version": "v1.0",
                        "algorithm": type(self.model).__name__,
                    }
                self.is_loaded = True
            except Exception as exc:
                print(f"Warning: Failed to load ML artifacts: {exc}")
                self.is_loaded = False
        else:
            self.is_loaded = False

    def predict(self, raw_input: dict) -> dict:
        """Generate readmission prediction for a single patient record."""
        if not self.is_loaded or self.model is None or self.preprocessor is None:
            # Re-attempt loading in case artifacts were freshly generated
            self._load_artifacts()
            if not self.is_loaded:
                raise RuntimeError("ML model or preprocessor artifact is not loaded.")

        sanitized = sanitize_input_row(raw_input)
        df = pd.DataFrame([sanitized])

        # Preprocess features
        X_trans = self.preprocessor.transform(df)

        # Generate readmission probability
        prob_array = self.model.predict_proba(X_trans)
        # Probability of positive class (readmission within 30 days)
        prob = float(prob_array[0][1])

        # Calculate risk score (0-100) and risk category
        risk_score = risk_engine.calculate_risk_score(prob)
        risk_category = risk_engine.determine_risk_category(risk_score)

        # Calculate model confidence score based on margin from decision boundary (0.5)
        # Margin of 0.5 gives 1.0 confidence, margin of 0 gives 0.5 confidence
        margin = abs(prob - 0.5) * 2
        confidence = round(0.50 + (margin * 0.45), 2)

        # Extract real patient contributing factors
        contributing_factors = self._extract_contributing_factors(sanitized, prob)

        # Decision support insight
        clinical_insights = risk_engine.generate_clinical_insights(risk_category, risk_score)

        return {
            "risk_score": risk_score,
            "risk_category": risk_category,
            "readmission_probability": round(prob, 4),
            "confidence_score": confidence,
            "contributing_factors": contributing_factors,
            "clinical_insights": clinical_insights,
            "model_name": self.metadata.get("algorithm", "XGBoost"),
            "model_version": self.metadata.get("version", "v1.0"),
        }

    def _extract_contributing_factors(self, data: dict, probability: float) -> list[dict]:
        """Derive clinically grounded contributing factors from features and thresholds."""
        factors: list[dict] = []

        # 1. Prior inpatient utilization
        inpatient = int(data.get("number_inpatient", 0) or 0)
        if inpatient >= 2:
            factors.append(
                {
                    "factor": "Multiple Prior Inpatient Admissions",
                    "detail": f"{inpatient} previous hospitalizations recorded",
                    "impact": "HIGH",
                    "direction": "INCREASES_RISK",
                }
            )
        elif inpatient == 1:
            factors.append(
                {
                    "factor": "Prior Inpatient Admission",
                    "detail": "1 previous hospitalization in the past 12 months",
                    "impact": "MODERATE",
                    "direction": "INCREASES_RISK",
                }
            )

        # 2. Length of stay
        time_hosp = int(data.get("time_in_hospital", 1) or 1)
        if time_hosp >= 7:
            factors.append(
                {
                    "factor": "Prolonged Inpatient Stay",
                    "detail": f"{time_hosp} days in hospital indicates high clinical complexity",
                    "impact": "MODERATE",
                    "direction": "INCREASES_RISK",
                }
            )
        elif time_hosp <= 2:
            factors.append(
                {
                    "factor": "Short Hospitalization Duration",
                    "detail": f"{time_hosp} days in hospital",
                    "impact": "LOW",
                    "direction": "DECREASES_RISK",
                }
            )

        # 3. Emergency utilization
        emergency = int(data.get("number_emergency", 0) or 0)
        if emergency >= 1:
            factors.append(
                {
                    "factor": "Emergency Department Utilization",
                    "detail": f"{emergency} emergency visits recorded",
                    "impact": "HIGH" if emergency >= 2 else "MODERATE",
                    "direction": "INCREASES_RISK",
                }
            )

        # 4. Medication complexity & modifications
        num_meds = int(data.get("num_medications", 0) or 0)
        if num_meds >= 20:
            factors.append(
                {
                    "factor": "Extensive Polypharmacy",
                    "detail": f"{num_meds} distinct medications prescribed",
                    "impact": "HIGH",
                    "direction": "INCREASES_RISK",
                }
            )
        elif num_meds >= 12:
            factors.append(
                {
                    "factor": "Moderate Polypharmacy",
                    "detail": f"{num_meds} active medications",
                    "impact": "LOW",
                    "direction": "INCREASES_RISK",
                }
            )

        # 5. Medication changes during episode
        if data.get("change") == "Ch":
            factors.append(
                {
                    "factor": "Diabetic Medication Regimen Change",
                    "detail": "Dosage titration or prescription adjustment during admission",
                    "impact": "MODERATE",
                    "direction": "INCREASES_RISK",
                }
            )

        # 6. Diagnosis burden
        num_diag = int(data.get("number_diagnoses", 0) or 0)
        if num_diag >= 8:
            factors.append(
                {
                    "factor": "High Comorbidity Burden",
                    "detail": f"{num_diag} diagnostic ICD codes assigned",
                    "impact": "HIGH",
                    "direction": "INCREASES_RISK",
                }
            )

        # 7. Glycemic control
        a1c = str(data.get("A1Cresult", "None"))
        if a1c == ">8":
            factors.append(
                {
                    "factor": "Suboptimal Glycemic Control (HbA1c > 8%)",
                    "detail": "Elevated HbA1c indicative of poor long-term diabetes management",
                    "impact": "HIGH",
                    "direction": "INCREASES_RISK",
                }
            )
        elif a1c == "Norm":
            factors.append(
                {
                    "factor": "Normal HbA1c Level",
                    "detail": "HbA1c tested within normal physiological range",
                    "impact": "LOW",
                    "direction": "DECREASES_RISK",
                }
            )

        if not factors:
            factors.append(
                {
                    "factor": "Standard Clinical Profile",
                    "detail": "Routine admission profile without acute complicating factors",
                    "impact": "LOW",
                    "direction": "NEUTRAL",
                }
            )

        return factors


predictor = ReadmissionPredictor.get_instance()
