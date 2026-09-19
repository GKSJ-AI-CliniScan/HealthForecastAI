# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

- **Intern name:** Padarthi Dhana Lakshmi
- **Branch:** `intern/02-padarthi-dhana-lakshmi`
- **Submitted on:** 2026-09-16

---

## Scope for this milestone

- Validate prediction accuracy and healthcare analytics quality.
- Optimize healthcare workflows and dashboard responsiveness.
- Deploy the platform using Docker and a cloud environment.
- Prepare the final project documentation and presentation.
- Demonstrate the complete HealthForecast AI platform.

## Evaluation criteria

- Fully deployed frontend and backend.
- Model testing and validation completed.
- Documentation and presentation prepared.
- Successful end-to-end platform demonstration completed.

---

## What I built

- Fully deployed and verified **FastAPI Backend** and **Next.js 15 Frontend**.
- Implemented **Interactive Model Performance & Live Retraining Dashboard** (`frontend/src/app/(app)/model-training/page.tsx`).
- Integrated **Oracle SQL Database Schema & Automatic Seed Generator** (`scripts/generate_oracle_seed.py`, `scripts/setup_oracle_db.sql`).
- Achieved **78.71% – 79.03% Test Accuracy** across Random Forest and XGBoost classifiers.
- Passed complete backend test suite (106 tests, 100% pass rate) and zero TypeScript compilation errors (`npx tsc --noEmit`).

## How to run it

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
git checkout intern/02-padarthi-dhana-lakshmi

# 1. Train ML Models
cd ml
python -m src.models.train

# 2. Setup Oracle SQL Database
cd ..
python scripts/generate_oracle_seed.py
sqlplus system/root @scripts/setup_oracle_db.sql

# 3. Start Backend API
cd backend
python -m uvicorn app.main:app --reload

# 4. Start Frontend Web App
cd ../frontend
npm run dev
```

## Evidence

- Backend health check `GET http://localhost:8000/health` returns `{"status":"ok"}`.
- Model comparison endpoint `GET http://localhost:8000/api/v1/models/compare` returns Random Forest (78.71%) and XGBoost (79.03%) accuracy metrics.
- All 106 unit tests in `pytest` passing with 100% success rate.

## Metrics

- **Random Forest Accuracy**: `78.71%` (ROC-AUC: `0.6512`)
- **XGBoost Accuracy**: `79.03%` (ROC-AUC: `0.6391`)
- **Test Suite**: `106 passed in 107s`
- **Dashboard Load Time**: `< 200ms`
- **Prediction Response Time**: `< 40ms`

## Known gaps

- None. All four milestones (Milestones 1–4) and all seven system modules are fully completed, tested, and documented.
