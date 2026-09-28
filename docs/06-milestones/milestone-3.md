# Milestone 3 report - Week 5 & 6 - Treatment Effectiveness Analysis & Healthcare Analytics

- **Intern name:** Parimala M
- **Branch:** `intern/24-parimala-m`
- **Submitted on:** 2026-09-28

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

**Backend** (`backend/`):
- Treatment effectiveness: endpoints to log a treatment outcome per patient, list a
  patient's treatment history, return an aggregate summary (total cases, improved
  rate, average recovery days) with an optional treatment-type filter, and return a
  month-by-month recovery trend.
- Healthcare analytics: three aggregate endpoints (hospital summary, readmission
  statistics, population health) built from stored patients and risk predictions.
- Clinical decision support: care recommendations and a discharge plan per patient,
  derived from that patient's latest risk category (rule-based).
- Researcher access: `GET /patients/anonymised` returns pseudo IDs, age group,
  gender, diagnosis and risk category only - no name, medical record number or
  assigned doctor.
- `GET /risk/scores`: latest risk score for every visible patient in every band,
  scoped by role (doctors see only their assigned patients).
- Role permissions in `rbac.py` aligned with the access matrix in the project brief.

**Frontend** (`frontend/`), Next.js with a role-aware sidebar:
- `/dashboard/treatment` - summary cards, treatment-type filter, monthly recovery
  trend chart and table, and a form to log a treatment outcome.
- `/dashboard/clinical-support` - pick a patient, see care recommendations and
  whether close monitoring is required.
- `/dashboard/analytics` - hospital-wide totals, current risk distribution and
  population health breakdown.
- `/dashboard/registry` - every visible patient with risk band, readmission
  percentage and latest treatment; system admins can add patients.
- `/dashboard/research` - de-identified cohort view for researchers.
- `/dashboard/users` - system admin user management (list, create, change role,
  deactivate).

## How to run it

    # Backend
    cd backend
    pip install -r requirements-dev.txt
    uvicorn app.main:app --reload
    # Swagger UI: http://127.0.0.1:8000/docs

    # Frontend
    cd frontend
    npm install
    npm run dev
    # http://localhost:3000/login

## Evidence

- Clinical decision support gives different output per patient: a low-risk
  patient gets a single standard follow-up line, a high-risk patient gets three
  recommendations and "requires close monitoring: yes". It is not a static response.
- Risk counts agree across the registry, analytics and research pages (2 high,
  2 medium, 1 low for the five seeded patients), so all three read the same data.
- The research cohort page shows pseudo IDs only, with no medical record number,
  name or doctor column.
- The sidebar changes by role: system admin sees every module, hospital admin sees
  Overview, Treatment Effectiveness, Healthcare Analytics and Patients Registry.
- Treatment page after seeding five outcomes: 5 total cases, 60.0% improved,
  13 average recovery days, 54.4% average effectiveness for the month.
- Analytics page: 5 patients, 6 predictions made, 19.8% average readmission risk.

## Metrics

The prediction model is unchanged from Milestone 2 (calibrated XGBoost, test
ROC-AUC 0.669, recall 0.544). This milestone's numbers are descriptive results
from the stored data:

- Treatment outcomes: 5 cases, 60.0% improved, 13 days average recovery,
  54.4% average effectiveness score.
- Hospital analytics: 5 patients, 6 predictions, 19.8% average readmission risk,
  risk distribution 2 high / 2 medium / 1 low.

These come from a small seeded dataset, so they show the workflows work end to
end; they are not clinical findings.

## Known gaps

- All patient, prediction and treatment data is synthetic seed data, entered to
  exercise the workflows.
- Clinical recommendations are simple rules on the risk category, not a trained
  recommendation model.
- Recovery trends have only one month of data, so the trend line is a single point.
- Forecasting still scales the 30-day probability linearly to other horizons; it
  is not a time-series model.
- List endpoints return all rows with no pagination.
- The login token is kept in sessionStorage, not an httpOnly cookie.
- There are no automated frontend tests yet.