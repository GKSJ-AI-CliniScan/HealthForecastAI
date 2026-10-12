# Milestone 3 report - Week 5 & 6 - Treatment Effectiveness Analysis & Healthcare Analytics

- **Intern name:** Niyati R
- **Branch:** `intern/19-niyati-r`
- **Submitted on:** Not recorded. The work was committed on 2026-09-27 (commits `b8263c0`, `83eea5b`, `2abdb71`, `ae30d4f`) and refined afterwards. This report was completed on 2026-10-12; the submission date is for the intern to set when the branch is sent to the mentor.

> **Data caveat.** The treatment-effectiveness figures depend on treatment
> outcome rows that **neither dataset importer creates** for the India export
> (see Known gaps). Any such rows in a development database come from other
> means, such as synthetic test data, so the effectiveness figures are a working
> demonstration of the analysis, **not evidence about real treatments**.

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

### Where each criterion stands

| Criterion | Status | Basis |
|---|---|---|
| Treatment effectiveness analysis and analytics dashboard | Implemented | 6 treatment routes and 8 analytics routes with matching pages |
| Patient outcome reports functional | Implemented | `patient_outcomes` report type; discharge-outcome analytics |
| Hospital performance analytics | Implemented | Department comparison, hospital summary and readmission analytics |
| Trend monitoring integrated | Implemented | Readmission trend, generic metric trends, recovery trend |

| Scope item | Status |
|---|---|
| Treatment evaluation workflows | Done: success rate, outcome distribution, department effectiveness, treatment comparison, readmission reduction |
| Recovery and treatment effectiveness reports | Done as downloadable reports (CSV, XLSX, PDF) |
| Medication outcome analysis | Partly: outcomes are analysed per treatment name and the medication-change flag is stored; there is no separate medication-specific module |
| Healthcare performance dashboards | Done (Analytics section, five tabs) |
| Patient outcome analytics reports | Done |
| Trend monitoring tools | Done (charts with a selectable period) |

---

## What I built

**Treatment effectiveness** (`/api/v1/treatment/*`, `treatment_service.py`). Six
read endpoints: success rate by treatment, outcome distribution, effectiveness
by department, weekly recovery trend, readmission reduction for a named
treatment against the baseline, and a comparison of treatments for a diagnosis.
Success rate is the share of outcomes recorded as *improved*. Doctors hold only
`treatment_report:read_limited`, so their figures cover their own patients;
hospital administrators, researchers and system administrators see hospital-wide
figures. Treatment outcomes can be recorded per admission by the system
administrator (`POST /patients/{id}/admissions/{id}/treatments`).

**Healthcare analytics** (`/api/v1/analytics/*`, `analytics_service.py`). Hospital
summary, monthly readmission trend, discharge-outcome distribution, department
comparison (sortable, with an admission date range), a generic trend endpoint,
population health summary, and the research cohort statistics. Figures are
narrowed by the same patient-scope rule as patient queries.

**Research and anonymised export.** `GET /patients/anonymised`,
`GET /analytics/research-cohort` and `GET /analytics/research-export` serve a
de-identified cohort: salted pseudonymous ids, generalised age bands, no medical
record number, and a minimum cohort size of 10 (a smaller cohort is refused with
`422`). Exports are CSV with spreadsheet formulas neutralised and every export is
written to the audit log with its filters.

**Reporting** (`/api/v1/reports/*`, `report_service.py`). Seven report types
(`treatment_effectiveness`, `patient_outcomes`, `department_performance`,
`population_health`, `risk_distribution`, `readmission_analytics`,
`research_cohort`) in CSV, XLSX or PDF. A report reuses the analytics and
treatment services, so a report cannot disagree with its dashboard, and the data
permission is re-checked on each download. Files live under
`REPORT_STORAGE_DIR` with metadata in the `reports` table; a purge route removes
expired ones; callers see their own reports and the system administrator sees all.

**Frontend** (`frontend/src/app/dashboard/`): Analytics (readmissions, patient
outcomes, risk distribution, departments, population health), Treatment
(filters, four charts and two lookup forms), Research (cohort filters,
statistics, export, anonymised cohort) and Reports (generate, history,
download, delete), each with loading, empty, error and no-access states.
Navigation shows only the sections a role holds permission for.

**Tests.** `test_treatment.py` (27 functions), `test_analytics.py` (28),
`test_research_export.py` (28), `test_reports.py` (34), and the frontend tests for
the research, reports and analytics-risk pages and the shared components.

## How to run it

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
git checkout intern/19-niyati-r

cd backend
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head                                       # includes reports and department columns
uvicorn app.main:app --reload                              # http://localhost:8000/docs

cd ../frontend && npm install && npm run dev              # http://localhost:3000
```

Sign in as a role that holds the section's permission (see
[`docs/04-rbac`](../04-rbac/README.md)). The analytics, treatment and report
pages are empty until the database holds admissions and treatment outcomes; the
treatment pages need outcome rows that no importer creates. The endpoints are
listed in [`docs/03-api`](../03-api/README.md), and the backend tests need no
database server:

```bash
cd backend && pytest tests/test_treatment.py tests/test_analytics.py tests/test_research_export.py tests/test_reports.py -q
```

## Evidence

| Evidence | Where | Status |
|---|---|---|
| Endpoints exist and are guarded as documented | 20 routes: [`docs/03-api`](../03-api/README.md) (analytics 8, treatment 6, reports 6) | Verified by route inspection |
| Backend suite including these areas | 579 passed, 33 skipped at commit `7b99155` | Executed 2026-10-12 |
| Frontend suite | 222 passed | Executed 2026-10-12 |
| Reports generated | A development database has 16 `reports` rows and generated files on disk | Read-only count; contents not inspected here |
| Screens | [`docs/05-wireframes`](../05-wireframes/README.md): treatment, analytics, reports, research | Retrospective wireframes; no committed screenshots |
| Role checks in a browser | Treatment and analytics pages were opened as the doctor and system-administrator roles during the interface work; the hospital administrator and researcher were not | Historical, scripts and images kept outside the repository |

No patient data appears in this report.

## Metrics

| Requested metric | Value |
|---|---|
| Number of analytics endpoints delivered | 20 across analytics (8), treatment (6) and reports (6) |
| Report types and formats | 7 types; CSV, XLSX and PDF |
| Treatment effectiveness measurement accuracy | **Not defined and not measured.** "Success rate" is a descriptive share of recorded outcomes, not a validated accuracy. |
| Risk classification quality | See [Milestone 2](milestone-2.md): readmission ROC-AUC 0.741, risk ROC-AUC 0.656 (experimental) |
| Dashboard load time | **Not measured** |
| Tests in these areas (functions) | 117 backend, plus frontend page tests |

## Known gaps

1. **Treatment outcomes are not real clinical outcomes.** Neither importer creates
   `treatment_outcomes` rows, and the India export has no treatment or
   department field. A database that holds such rows was filled by other means
   (for example synthetic seeding for testing). The effectiveness figures,
   rankings and charts therefore demonstrate the method only. Do not read them as
   findings about treatments.
2. **Department-level analytics depend on the same missing data.**
   `admissions.department` stays empty for the India export.
3. **Synthea is not implemented.** The SRS lists a Synthea (synthetic patient
   journey) dataset, and the Milestone 3 design document recommended descoping
   it. There is no FHIR parser, no loader and no `patient_journey_events` table.
   The mentor's agreement to descope is not recorded.
4. **No outcome-versus-prediction feedback.** Predictions are not compared with
   what happened (`actual_readmitted` is never written), so analytics cannot
   report prediction accuracy.
5. **Doctor access to analytics is undefined.** The brief gives the doctor a
   "Limited" hospital analytics dashboard; the implementation gives none (`403`).
   Treatment effectiveness for doctors is limited to their own patients, where
   the brief says "Yes". Both are documented in
   [`docs/04-rbac`](../04-rbac/README.md#6-known-gaps-and-open-decisions) as open
   decisions.
6. **A doctor cannot generate reports.** The brief lists patient outcome reports
   for doctors; reports require `analytics:export`, which doctors do not hold.
7. **No performance evidence.** Dashboard load time, report generation time and
   concurrency were not measured.
8. **Browser coverage is partial.** The hospital administrator and researcher
   pages were verified by tests but not opened in a browser during the interface
   work.
9. **Research privacy is a guard, not a guarantee.** The minimum cohort size and
   generalisation reduce re-identification risk; they are not a formal privacy
   proof and have not been reviewed by a privacy specialist.
