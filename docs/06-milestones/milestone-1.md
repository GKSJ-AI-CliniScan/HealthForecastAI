# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Raniya Raseen M M
- **Branch:** `intern/18-raniya-raseen-m-m`
- **Submitted on:** 2026-10-17

---

## Scope for this milestone

- Define healthcare workflows and project objectives.
- Design the system architecture and database schema.
- Create UI wireframes and plan the workflows.
- Set up the frontend and backend environments.
- Implement authentication, role-based access control, user permissions and
  dashboard access for Doctors, Hospital Administrators, Healthcare Researchers
  and System Administrators.
- Load the Diabetes 130-US Hospitals dataset.
- Build patient management and healthcare dashboard workflows.

## Evaluation criteria

- Project initialization and architecture setup completed.
- Authentication, role-based access control and patient management workflows implemented.
- Healthcare dashboard functional.
- Dataset integration and preprocessing completed.

---

## What I built

I completed only the dataset integration and preprocessing part of this milestone. I did not implement authentication, role-based access control, patient management or the dashboard.

- **Dataset loading and cleaning** (`ml/src/features/preprocess.py`): reads `diabetic_data.csv` (101,766 encounters), replaces `?` with missing values, drops the columns that are mostly empty (`weight`, `max_glu_serum`, `A1Cresult`, `medical_specialty`, `payer_code`), fills missing `race` with `Unknown`, drops the few rows with a missing diagnosis, and creates the target `risk_label` (1 if the patient was readmitted at any time, 0 if never). The cleaned file has about 100,000 rows (80,195 training plus 20,049 test rows were used later).
- **Feature engineering** (`ml/src/features/feature_engineering.py`): drops identifier columns (`encounter_id`, `patient_nbr`) and the original `readmitted` column so the answer is not a feature, groups the three diagnosis ICD-9 codes into nine categories (Circulatory, Respiratory, Digestive, Diabetes, Injury, Musculoskeletal, Genitourinary, Neoplasms, Other), and one-hot encodes all text columns, giving 101 model features.

## How to run it

Download the dataset into `ml/data/processed/` as described in `ml/data/README.md` (it is not committed), then:

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI
cd HealthForecastAI
git checkout intern/18-raniya-raseen-m-m
pip install -r ml/requirements.txt
cd ml/data/processed
python ../../src/features/preprocess.py            # writes diabetic_data_cleaned.csv
python ../../src/features/feature_engineering.py   # writes diabetic_data_features.csv
```

## Evidence

Running `train_model.py` on the feature file reports a training set of (80195, 101) and a test set of (20049, 101), which shows the preprocessing and feature engineering produce 101 usable features for about 100,000 patients. See the Evidence section of `milestone-2.md` for the full terminal output.

## Metrics

- Dataset rows loaded: 101,766.
- Rows after cleaning: about 100,244 (80,195 training + 20,049 test).
- Model features after encoding: 101.
- Backend API endpoints implemented for this milestone: 0.
- Database tables created: 0.
- Backend test coverage: not applicable (no backend code written).

## Known gaps

- No authentication, JWT tokens or role-based access control for the four roles.
- No patient management (create, view, update) and no database tables or migrations.
- No healthcare dashboard and no UI wireframes.
- No architecture or workflow documentation written by me.
- Preprocessing keeps all encounters, including several for the same patient, and does not split by patient (see the leakage note in `milestone-2.md`).
- The scripts read and write CSV files in the folder they are run from, so they must be run from `ml/data/processed/`. A configuration file and proper paths would be cleaner.
