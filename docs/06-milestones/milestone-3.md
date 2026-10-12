# Milestone 3 report - Week 5 & 6 - Treatment Effectiveness Analysis & Healthcare Analytics

- **Submitted on:** 2026-09-30
- **Status:** Complete

---

## Scope for this milestone

- Implement treatment evaluation workflows.
- Generate recovery and treatment effectiveness reports.
- Develop medication outcome analysis modules.
- Build healthcare performance dashboards.
- Generate patient outcome analytics reports.
- Develop healthcare trend monitoring tools.

## Evaluation criteria

- Treatment effectiveness analysis and healthcare analytics dashboard implemented.
- Patient outcome reports functional.
- Hospital performance analytics generated successfully.
- Trend monitoring workflows integrated.

---

## What I built

### 1. Data changes & Schema Extension
- Schema extended via Alembic migrations (`0032e1b3059c`, `b7c41f9d2e05`, `c1f4a0d1b2e3`, `d8e9a2b3c4f5`).
- Populates `treatment_outcomes`, `clinical_insights`, and enhanced patient encounter metrics (`a1c_result`, `medication_changed`, `department`, prior visit counts).
- ETL loads 74,799 treatment rows across 23 medication columns.
- Provided Oracle SQL schemas and seed scripts (`scripts/setup_oracle_db.sql`, `scripts/generate_oracle_seed.py`, `scripts/verify_oracle_db.sql`).

### 2. Backend Analytics & Clinical Decision Support Modules
- **`services/treatment_service.py` & `api/v1/endpoints/treatment.py`**:
  - Implements medication outcome analysis, recovery trends, and stratified odds ratio analysis.
  - Endpoints: `/treatment`, `/treatment/summary`, `/treatment/medications`, `/treatment/recovery-trends`, `/treatment/care-processes`.
- **`services/cds_service.py` & `api/v1/endpoints/clinical_support.py`**:
  - 14 transparent clinical recommendation rules, risk mitigation, and discharge care planning.
  - Endpoints: `/clinical-support/recommendations/{id}`, `/clinical-support/discharge-plan/{id}`, `/clinical-support/rules`, `/clinical-support/insights`.
- **`services/performance_service.py` & `api/v1/endpoints/analytics.py`**:
  - Risk-adjusted department performance, trend monitoring (p-charts), and dimension breakdowns.
  - Compatibility routes: `/hospital-dashboard`, `/research`.
- **`services/stats.py`**:
  - Wilson score intervals, Mantel-Haenszel stratified odds ratios, exact Poisson intervals, and control chart limits.
- **`services/reports_service.py`**:
  - Patient outcome summaries, hospital performance CSV generation, and k-anonymous research datasets.

### 3. Frontend Healthcare Analytics Suite
- **`/treatment`**: 6-tab clinical suite featuring medication outcome comparisons, recovery progress tracking, and regimen analysis.
- **`/analytics` & `/performance`**: Department-level control charts, observed-vs-expected tables, and CSV export.
- **Patient Details (`/patients/[id]`)**: Unified CDS recommendations, occlusion-based risk factor waterfall, and discharge planning modal.
- Extended **AppShell Navigation** (`frontend/src/components/layout/AppShell.tsx`) with role-based access for Doctor, Hospital Admin, Researcher, and System Admin.

---

## How to run it

```bash
# 1. Database and Backend
cd backend
alembic upgrade head
python -m app.db.init_db
uvicorn app.main:app --reload

# 2. Machine Learning Pipeline
cd ../ml
python -m src.data.etl
python -m src.models.train
python -m src.models.score

# 3. Frontend Web Application
cd ../frontend
npm install
npm run dev
```

Run test suites:
```bash
# Backend tests
cd backend && pytest

# ML tests
cd ml && pytest
```

---

## Evidence

- **Adjusted Medication Outcomes:** Insulin patients readmit at 10.1% vs 8.6% for non-insulin (crude OR 1.20; adjusted Mantel-Haenszel OR 1.22, 95% CI 1.15–1.29).
- **Recovery Metrics:** Stable recovery (defined as non-readmitted within 30 days and discharged home) stands at 69.0% overall (95% CI 68.6%–69.4%).
- **Observed vs Expected Performance:** Sum of predicted probabilities yields 5,894 observed vs 5,923 expected readmissions (O/E ratio 0.995). Small department cohorts (<11) are suppressed.
- **Trend Monitoring & Follow-Up Buffer:** P-chart monitoring detected right-censoring in latest encounters, corrected via a 10% follow-up buffer fraction in `config.yaml`.
- **Audit Logging:** Every patient record read, CDS recommendation access, and report generation is captured in the database audit log.

---

## Metrics

| Measure | Value |
|---|---|
| Cohort after cleaning | 62,991 patients |
| 30-day readmission rate | 9.36% |
| Promoted model | XGBoost (threshold 0.1012 / 0.30) |
| Held-out ROC-AUC | 0.633 (95% CI 0.618–0.650) |
| Recall / Precision at threshold | 0.501 / 0.142 |
| Backend test suite | 306 passed tests (100% pass rate) |
| Frontend checks | `tsc --noEmit`, `eslint`, and `next build` clean (15/15 static pages) |
| New endpoints | 14 functional clinical endpoints |

---

## Known gaps and considerations
- **Fairness Metrics:** Documented disparity in recall across genders (0.45 men vs 0.55 women) and age brackets. Detailed in `docs/07-testing/fairness-audit.md`.
- **Illustrative Decision Rules:** CDS rules provide clinical guidance but require physician confirmation prior to order entry.
- **Occlusion-Based Attribution:** XGBoost explanations use occlusion rather than additive SHAP values due to balanced class weighting.
