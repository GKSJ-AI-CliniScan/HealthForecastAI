# Milestone 3 report - Week 5 & 6 - Treatment Effectiveness Analysis & Healthcare Analytics

- **Intern name:** Raniya Raseen M M
- **Branch:** `intern/18-raniya-raseen-m-m`
- **Submitted on:** 2026-10-20

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

- **Treatment effectiveness** (`services/treatment_service.py`, `endpoints/treatment.py`): `GET /treatment` groups patients by treatment (insulin adjustment, metformin, dual therapy, lifestyle counselling) and reports patients treated, average recovery score and readmission rate, best recovery first. `GET /treatment/recovery-trends` gives the average recovery score per month.
- **Hospital analytics** (`services/analytics_service.py`, `endpoints/analytics.py`): `GET /analytics/summary` returns patients, readmission rate, average length of stay and the low/medium/high risk split. `GET /analytics/readmissions` returns admissions and readmission rate per month, which is the trend series.
- **Population health for researchers:** `GET /analytics/population-health` returns cohorts by age group with aggregate values only. Any group smaller than 5 patients is left out so no individual can be singled out.
- **Report export:** `GET /analytics/export` downloads the monthly readmission series as CSV (hospital administrator and researcher).
- **Dashboard:** the treatment table, monthly readmission bars and summary card in `frontend/src/components/dashboard/Dashboard.tsx`.

## How to run it

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI
cd HealthForecastAI
git checkout intern/18-raniya-raseen-m-m
cd backend
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload     # open http://localhost:8000/docs
# log in at POST /api/v1/auth/login as admin@hospital.test / Admin@123, click Authorize,
# then try GET /api/v1/analytics/summary, /analytics/readmissions and /treatment
```

## Evidence

Running the analytics services directly on the 120 seeded synthetic patients gave:

- Summary: 120 patients, readmission rate 0.467, average stay 7.13 days, risk split 53 low / 52 medium / 15 high.
- Monthly series, first rows: 2025-01 had 9 admissions at 0.444; 2025-02 had 5 at 0.6.
- Treatments, best first: Metformin (23 patients, recovery 65.1, readmission 0.348), Dual therapy (38 patients, recovery 63.0, readmission 0.5).
- Population health: 6 age groups, all with at least 7 patients, none suppressed.

Tests: `backend/tests/test_analytics_api.py`.

## Metrics

- Endpoints implemented: 6.
- Backend tests for this milestone: 6 (the risk-driven reports from milestone 2 are tested in `test_risk_api.py`).
- All figures above come from synthetic data, so they show that the calculations work. They say nothing about real hospital performance.

## Known gaps

- **Synthetic data only.** Treatment, recovery score and outcome values are generated from the risk score with random noise (fixed seed). The treatment ranking is therefore not a real finding. These endpoints must be re-run on real treatment outcomes before any result is quoted.
- **No causal analysis.** Treatment groups are compared by simple averages. I did not adjust for differences between patients, so "effective" only means "higher average recovery score".
- **Medication outcome analysis is thin.** There is a treatment-level view but no per-drug analysis from the dataset's medication columns.
- **No individual patient outcome report** and no PDF export; only the CSV above.
- **No alerting** on trends. The monthly series is shown but nothing watches it for deterioration.
- **Not run before submission:** backend tests and `npm run build` were not run on my machine; the CI result is the evidence.
