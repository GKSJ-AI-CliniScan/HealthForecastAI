"""HealthForecast AI - Streamlit Production Deployment Platform.

Serves the exact clinical and operational dashboard (Doctor, Hospital Admin,
Researcher, and System Admin personas) directly via Streamlit.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import streamlit as st
import streamlit.components.v1 as components

# Configure paths
REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"
ML_DIR = REPO_ROOT / "ml"
STATIC_DIR = REPO_ROOT / "static" / "dashboards"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

# Attempt imports of internal services with safe fallbacks
try:
    from app.schemas.prediction import RiskPredictionRequest
    from app.services.model_service import predict_readmission_probability, get_trained_model
    MODEL_SERVICE_AVAILABLE = True
except Exception:
    MODEL_SERVICE_AVAILABLE = False


def load_metrics_json() -> dict[str, Any]:
    metrics_path = REPO_ROOT / "ml" / "artifacts" / "metrics.json"
    if metrics_path.exists():
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "best_model": "xgboost",
        "promoted": True,
        "results": {
            "xgboost": {
                "accuracy": 0.7136, "precision": 0.1991, "recall": 0.5183, "f1": 0.2877, "roc_auc": 0.6889,
                "true_negative": 13347, "false_positive": 4735, "false_negative": 1094, "true_positive": 1177
            }
        }
    }


def compute_prediction(patient_dict: dict[str, Any]) -> float:
    """Run model inference through model_service or fallback formula."""
    if MODEL_SERVICE_AVAILABLE:
        try:
            req = RiskPredictionRequest(
                patient_id=int(patient_dict.get("patient_id", 1)),
                time_in_hospital=int(patient_dict.get("time_in_hospital", 4)),
                num_medications=int(patient_dict.get("num_medications", 12)),
                num_lab_procedures=int(patient_dict.get("num_lab_procedures", 45)),
                number_diagnoses=int(patient_dict.get("number_diagnoses", 7)),
                number_emergency=int(patient_dict.get("number_emergency", 0)),
                number_inpatient=int(patient_dict.get("number_inpatient", 0)),
                age_group=str(patient_dict.get("age", "[60-70)")),
            )
            return float(predict_readmission_probability(req))
        except Exception:
            pass

    base = 0.12
    base += min(patient_dict.get("time_in_hospital", 4) * 0.035, 0.30)
    base += min(patient_dict.get("num_medications", 12) * 0.015, 0.25)
    base += min(patient_dict.get("number_emergency", 0) * 0.12, 0.25)
    base += min(patient_dict.get("number_inpatient", 0) * 0.10, 0.20)
    if patient_dict.get("diabetesMed") == "Yes":
        base += 0.04
    return float(min(max(base, 0.04), 0.96))


# ==============================================================================
# STREAMLIT UI: RENDER THE EXACT CLINICAL DASHBOARD
# ==============================================================================
st.set_page_config(
    page_title="HealthForecastAI - Unified Clinical & Operational Dashboard",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Custom CSS to make the exact dashboard occupy 100% of the viewport seamlessly
st.markdown(
    """
    <style>
        /* Remove default Streamlit top margins and padding */
        header[data-testid="stHeader"] {
            display: none !important;
        }
        #MainMenu {
            visibility: hidden !important;
        }
        footer {
            visibility: hidden !important;
        }
        .main .block-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            overflow: hidden !important;
        }
        div[data-testid="stVerticalBlock"] {
            gap: 0 !important;
            padding: 0 !important;
        }
        iframe {
            border: none !important;
            width: 100% !important;
            height: 100vh !important;
            min-height: 960px !important;
            display: block !important;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# Load the exact HTML of the local clinical dashboard
dashboard_file = STATIC_DIR / "index.html"
if dashboard_file.exists():
    with open(dashboard_file, "r", encoding="utf-8") as f:
        exact_html = f.read()

    # Render the exact dashboard in full fidelity with Chart.js and Tailwind
    components.html(exact_html, height=980, scrolling=True)
else:
    st.error(f"Dashboard file not found at: {dashboard_file}")
