"""HealthForecast AI — Diabetes 130-US Hospitals Preprocessing Pipeline.

Demonstration script for data ingestion, cleaning, ICD-9 mapping, and feature engineering.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.data.preprocess import basic_clean, map_icd9_to_category
from src.features.build_features import add_utilisation_features


def map_readmission_target(readmitted_val: str) -> int:
    """Map 30-day readmission outcome: '<30' -> 1, '>30' or 'NO' -> 0."""
    return 1 if readmitted_val == "<30" else 0


def map_dosage_change(dosage_val: str) -> int:
    """Encode medication dosage alterations."""
    mapping = {"No": 0, "Steady": 1, "Up": 2, "Down": 3}
    return mapping.get(dosage_val, 0)


def generate_sample_dataset() -> list[dict[str, Any]]:
    """Generate representative sample records for the Diabetes 130-US Hospitals cohort."""
    return [
        {
            "encounter_id": 2278392,
            "patient_nbr": 8222157,
            "race": "Caucasian",
            "gender": "Female",
            "age": "[0-10)",
            "weight": "?",
            "admission_type_id": 6,
            "discharge_disposition_id": 25,
            "admission_source_id": 1,
            "time_in_hospital": 1,
            "payer_code": "?",
            "medical_specialty": "Pediatrics-Endocrinology",
            "num_lab_procedures": 41,
            "num_procedures": 0,
            "num_medications": 1,
            "number_outpatient": 0,
            "number_emergency": 0,
            "number_inpatient": 0,
            "diag_1": "250.01",
            "diag_2": "?",
            "diag_3": "?",
            "number_diagnoses": 1,
            "max_glu_serum": "None",
            "A1Cresult": "None",
            "metformin": "No",
            "repaglinide": "No",
            "nateglinide": "No",
            "chlorpropamide": "No",
            "glimepiride": "No",
            "glipizide": "No",
            "glyburide": "No",
            "tolbutamide": "No",
            "pioglitazone": "No",
            "rosiglitazone": "No",
            "acarbose": "No",
            "miglitol": "No",
            "troglitazone": "No",
            "tolazamide": "No",
            "examide": "No",
            "citoglipton": "No",
            "insulin": "No",
            "glyburide-metformin": "No",
            "glipizide-metformin": "No",
            "glimepiride-pioglitazone": "No",
            "metformin-rosiglitazone": "No",
            "metformin-pioglitazone": "No",
            "change": "No",
            "diabetesMed": "No",
            "readmitted": "NO",
        },
        {
            "encounter_id": 149190,
            "patient_nbr": 55629189,
            "race": "Caucasian",
            "gender": "Female",
            "age": "[10-20)",
            "weight": "?",
            "admission_type_id": 1,
            "discharge_disposition_id": 1,
            "admission_source_id": 7,
            "time_in_hospital": 3,
            "payer_code": "?",
            "medical_specialty": "?",
            "num_lab_procedures": 59,
            "num_procedures": 0,
            "num_medications": 18,
            "number_outpatient": 0,
            "number_emergency": 0,
            "number_inpatient": 0,
            "diag_1": "276",
            "diag_2": "250.01",
            "diag_3": "255",
            "number_diagnoses": 9,
            "max_glu_serum": "None",
            "A1Cresult": "None",
            "metformin": "No",
            "repaglinide": "No",
            "nateglinide": "No",
            "chlorpropamide": "No",
            "glimepiride": "No",
            "glipizide": "No",
            "glyburide": "No",
            "tolbutamide": "No",
            "pioglitazone": "No",
            "rosiglitazone": "No",
            "acarbose": "No",
            "miglitol": "No",
            "troglitazone": "No",
            "tolazamide": "No",
            "examide": "No",
            "citoglipton": "No",
            "insulin": "Up",
            "glyburide-metformin": "No",
            "glipizide-metformin": "No",
            "glimepiride-pioglitazone": "No",
            "metformin-rosiglitazone": "No",
            "metformin-pioglitazone": "No",
            "change": "Ch",
            "diabetesMed": "Yes",
            "readmitted": ">30",
        },
        {
            "encounter_id": 64410,
            "patient_nbr": 86047875,
            "race": "AfricanAmerican",
            "gender": "Female",
            "age": "[20-30)",
            "weight": "?",
            "admission_type_id": 1,
            "discharge_disposition_id": 1,
            "admission_source_id": 7,
            "time_in_hospital": 2,
            "payer_code": "?",
            "medical_specialty": "?",
            "num_lab_procedures": 11,
            "num_procedures": 5,
            "num_medications": 13,
            "number_outpatient": 2,
            "number_emergency": 0,
            "number_inpatient": 1,
            "diag_1": "648",
            "diag_2": "250",
            "diag_3": "V27",
            "number_diagnoses": 6,
            "max_glu_serum": "None",
            "A1Cresult": "None",
            "metformin": "No",
            "repaglinide": "No",
            "nateglinide": "No",
            "chlorpropamide": "No",
            "glimepiride": "No",
            "glipizide": "No",
            "glyburide": "No",
            "tolbutamide": "No",
            "pioglitazone": "No",
            "rosiglitazone": "No",
            "acarbose": "No",
            "miglitol": "No",
            "troglitazone": "No",
            "tolazamide": "No",
            "examide": "No",
            "citoglipton": "No",
            "insulin": "No",
            "glyburide-metformin": "No",
            "glipizide-metformin": "No",
            "glimepiride-pioglitazone": "No",
            "metformin-rosiglitazone": "No",
            "metformin-pioglitazone": "No",
            "change": "No",
            "diabetesMed": "No",
            "readmitted": "NO",
        },
    ]


def preprocess_dataset(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Clean and encode patient records."""
    cleaned_records: list[dict[str, Any]] = []

    for row in records:
        cleaned = {
            "encounter_id": row["encounter_id"],
            "patient_nbr": row["patient_nbr"],
            "gender": row["gender"],
            "age_group": row["age"],
            "time_in_hospital": row["time_in_hospital"],
            "num_lab_procedures": row["num_lab_procedures"],
            "num_procedures": row["num_procedures"],
            "num_medications": row["num_medications"],
            "number_diagnoses": row["number_diagnoses"],
            "number_inpatient": row["number_inpatient"],
            "number_emergency": row["number_emergency"],
            "number_outpatient": row["number_outpatient"],
            "primary_diag_icd9": row["diag_1"],
            "primary_diag_category": map_icd9_to_category(row["diag_1"]),
            "secondary_diag_category": map_icd9_to_category(row["diag_2"]),
            "additional_diag_category": map_icd9_to_category(row["diag_3"]),
            "max_glu_serum": (
                row["max_glu_serum"] if row["max_glu_serum"] != "None" else "Not Tested"
            ),
            "a1c_result": row["A1Cresult"] if row["A1Cresult"] != "None" else "Not Tested",
            "metformin_encoded": map_dosage_change(row.get("metformin", "No")),
            "insulin_encoded": map_dosage_change(row.get("insulin", "No")),
            "glipizide_encoded": map_dosage_change(row.get("glipizide", "No")),
            "glyburide_encoded": map_dosage_change(row.get("glyburide", "No")),
            "medication_change": 1 if row.get("change") == "Ch" else 0,
            "diabetes_med_prescribed": 1 if row.get("diabetesMed") == "Yes" else 0,
            "readmission_raw": row["readmitted"],
            "target_readmitted_30d": map_readmission_target(row["readmitted"]),
        }
        cleaned_records.append(cleaned)

    return cleaned_records


def main() -> None:
    """Run demonstration preprocessing."""
    print("HealthForecast AI — Preprocessing Pipeline")
    raw_data = generate_sample_dataset()
    cleaned_data = preprocess_dataset(raw_data)
    print(f"Processed {len(cleaned_data)} sample records successfully.")


if __name__ == "__main__":
    main()
