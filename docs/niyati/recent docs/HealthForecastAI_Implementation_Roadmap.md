# HealthForecast AI — Implementation Roadmap

**Document Version:** 1.0
**Synthesizes:** `HealthForecastAI_Repository_Audit.md`, `HealthForecastAI_Gap_Analysis.md`, `HealthForecastAI_Milestone2_Design.md`, `HealthForecastAI_Milestone3_Design.md`
**Constraint:** every step below must respect `INTERN_GUIDE.md` — work happens on `intern/19-niyati-r` (or its active feature branches), never targets `main`, never edits `.github/**`/`scripts/ci/**`/`backend/tests/test_rbac.py`, never commits `.env`/datasets/model artifacts, and every new endpoint must declare a `require_permission(...)`/`require_role(...)` dependency.

---

## 1. Pre-Work: Resolve the Two Open Architectural Conflicts

**This blocks everything else and must happen first — it is a decision, not code.**

1. Confirm with mentor: PostgreSQL-only (ratify Database Design doc) vs. keep MongoDB (ratify original brief/scaffold). *Recommended: PostgreSQL-only — MongoDB is currently dead infrastructure that blocks backend container startup for zero functional benefit.*
2. Confirm with mentor: India Hospital Readmission Dataset (ratify ML Design doc) vs. Diabetes 130-US (ratify scaffold default). *Recommended: India Hospital Readmission as primary, Diabetes 130-US retained as CI/dev fallback — the backend importer already supports both, so this costs nothing to keep.*
3. Record the resolution in `docs/06-milestones/milestone-2.md`'s eventual "Known gaps"/intro section and in `ml/data/README.md`.
4. If MongoDB is eliminated: remove the `mongodb` service from `docker-compose.yml`, delete `backend/app/db/mongodb.py`, remove `pymongo` from `requirements.txt`, remove `MONGO_URI`/`MONGO_DB` from `config.py`, and delete `database/mongodb/`.

---

## 2. Milestone 2 — File Creation & Coding Order

Dependencies flow strictly top-to-bottom within each phase; phases themselves are sequential.

### Phase A — Database (blocks everything else)
1. `backend/alembic/versions/0002_model_metadata.py` — new migration adding `model_metadata` table (Milestone 2 Design §3.1)
2. `backend/alembic/versions/0003_extend_risk_predictions.py` — new migration adding `prediction_type`, `readmission_probability`, `confidence_score`, `readmission_window`, `actual_readmitted`, `outcome_recorded_at` columns (§2.3, §4.5)
3. `backend/app/models/model_metadata.py` — new ORM model
4. `backend/app/models/prediction.py` — extend existing `RiskPrediction` model with the new columns
5. Update `backend/tests/test_database_schema.py`'s `EXPECTED_TABLES`/column assertions to match — **do not weaken existing assertions, only add new ones**

### Phase B — ML pipeline wiring
6. `ml/configs/config.yaml` — add `dataset.profile` key, correct promotion thresholds (`roc_auc: 0.75`, add `f1_high_risk: 0.70`)
7. `ml/src/data/db_source.py` — new: reads training rows from PostgreSQL instead of raw CSV
8. `ml/src/data/preprocess.py` — add the India Hospital Readmission cleaning path alongside the existing Diabetes path
9. `ml/src/models/train.py` — switch data source to `db_source.py`; add versioned artifact filenames; write a `model_metadata` row at the end of each run
10. Run `train.py` end-to-end against seeded dev data (from Milestone 1's dataset import) — produces the first real artifact in `ml/artifacts/`
11. `ml/tests/test_train_end_to_end.py` — new, trains against a tiny synthetic fixture in CI (not the real dataset)

### Phase C — Backend ML integration
12. `backend/app/services/ml/__init__.py`, `model_loader.py`, `feature_builder.py` (Milestone 2 Design §4.1-4.2)
13. `backend/app/repositories/risk_prediction_repository.py` — new
14. `backend/app/services/risk_service.py` — extend in place with `score_patient()`, `get_history()`, `list_high_risk()` (§4.3)
15. `backend/app/services/readmission_service.py` — new (§4.4)
16. `backend/app/services/cds_service.py` — implement `RecommendationEngine` (§6.1); requires Phase D's `care_recommendations` table first if strict ordering — can be developed in parallel and wired last

### Phase D — CDS table + API wiring
17. `backend/alembic/versions/0004_care_recommendations.py` — new migration (Milestone 2 Design §6)
18. `backend/app/models/care_recommendation.py` — new ORM model
19. `backend/app/api/v1/endpoints/risk.py` — replace stub bodies with real service calls (§5)
20. `backend/app/api/v1/endpoints/clinical_support.py` — replace stub bodies with `RecommendationEngine` calls
21. `backend/app/api/v1/endpoints/ml_models.py` — replace stub bodies with `model_metadata` queries; remove the MongoDB TODO comment
22. New endpoint file or extension: `POST /predictions/readmission`, `POST /predictions/feedback` (§5) — add to `risk.py` or a new `predictions.py`, whichever keeps the router file under ~150 lines (match existing file-size convention)
23. `backend/tests/test_risk_endpoints.py`, `test_readmission_endpoints.py`, `test_cds_endpoints.py` — new, following the existing `test_patients.py`/`test_admissions.py` pattern (happy path + 401/403/404/422 per file)

### Phase E — Frontend
24. `frontend/src/components/charts/RiskDistributionChart.tsx`, `TrendLineChart.tsx` — first real `recharts` usage
25. `frontend/src/app/dashboard/patients/[id]/page.tsx` — add "Risk & Recommendations" card
26. `frontend/src/app/dashboard/page.tsx` — add Risk Levels / Readmission Alerts sections for Doctor role
27. `frontend/src/app/dashboard/analytics/page.tsx` — new route for Hospital Administrator (Readmission Trends, Risk Distribution, Performance Metrics)
28. `frontend/src/lib/navigation.ts` — add "Analytics" nav link gated on the appropriate permission
29. Frontend tests for the above, following the existing `login/page.test.tsx` pattern

### Phase F — Documentation & submission
30. Fill in `docs/06-milestones/milestone-2.md` (What I built / How to run it / Evidence / Metrics — all 5 model metrics per `INTERN_GUIDE.md` / Known gaps)
31. Update `docs/03-api/README.md` and regenerate `docs/03-api/openapi.json`
32. Run all `scripts/ci/check_*.py` locally before pushing

---

## 3. Milestone 3 — File Creation & Coding Order

### Phase A — Database
1. `backend/alembic/versions/0005_admissions_department.py` — add `department` column to `admissions` (Milestone 3 Design §2.1)
2. `backend/alembic/versions/0006_reports_table.py` — new `reports` table (§4)
3. `backend/alembic/versions/0007_materialized_views.sql`-equivalent Alembic migration for `mv_department_outcome_summary` (§2.2)

### Phase B — Treatment Effectiveness
4. `backend/app/repositories/treatment_repository.py` — new
5. `backend/app/services/treatment_service.py` — implement in place (currently empty stub) (§1.3)
6. `backend/app/api/v1/endpoints/treatment.py` — replace stub bodies (§1.4)
7. `backend/tests/test_treatment.py` — new

### Phase C — Analytics
8. `backend/app/repositories/analytics_repository.py` — new, queries `mv_department_outcome_summary` + `risk_predictions`
9. `backend/app/services/analytics_service.py` — implement in place (§2.3)
10. `backend/app/api/v1/endpoints/analytics.py` — replace stub bodies
11. `backend/tests/test_analytics.py` — new

### Phase D — Research / Anonymization
12. `backend/app/utils/anonymisation.py` — add `anonymise_patient()` wrapper around existing `pseudonymise()`
13. `backend/app/services/patient_service.py` — add `list_for_research()` with cohort-size guard (§3.2)
14. `backend/app/api/v1/endpoints/patients.py` — wire `/anonymised` to real logic (§3.1)
15. `backend/tests/test_research_export.py` — new, including the small-cohort-rejection case

### Phase E — Reporting
16. `backend/app/models/report.py`, `backend/app/repositories/report_repository.py` — new
17. `backend/app/services/report_service.py` — new, CSV export via pandas
18. New `backend/app/api/v1/endpoints/reports.py` + register in `router.py`
19. `backend/tests/test_reports.py` — new

### Phase F — Frontend
20. `frontend/src/app/dashboard/analytics/page.tsx` — extend with Treatment Effectiveness + Department Performance tabs
21. `frontend/src/app/dashboard/research/page.tsx` — new Researcher-specific view
22. `frontend/src/app/dashboard/patients/[id]/page.tsx` — add Treatment Outcomes section
23. `frontend/src/lib/navigation.ts` — add "Research" nav link, new permission

### Phase G — Documentation & submission
24. Fill in `docs/06-milestones/milestone-3.md`
25. Note the Synthea descoping decision explicitly in "Known gaps"
26. Run CI checks locally

---

## 4. Testing Tasks (cross-cutting, both milestones)

- Every new service method gets a unit test (mirrors the M1 pattern: `test_risk_service.py`, `test_repositories.py`).
- Every new endpoint gets happy-path + 401/403/404/422 tests (mirrors `test_patients.py`/`test_admissions.py`).
- Never edit `backend/tests/test_rbac.py` — if a new permission breaks it, the permission matrix (`rbac.py`) needs updating, not the test.
- Milestone 4 will need `tests/integration/` and `tests/e2e/` populated — not in scope for M2/M3, but new endpoints should be written with an eye toward being easy to hit from a future Playwright/httpx integration test (i.e., no hidden global state, deterministic responses).

---

## 5. Deployment Tasks

Out of scope for Milestone 2/3 per the Implementation Plan's own milestone boundaries (`deployment/**` is explicitly Milestone-4-owned). The only deployment-adjacent action in M2/M3 is: if `ml/artifacts/` grows real model files, confirm they stay under `scripts/ci/check_files.py`'s 5MB limit or are added to `.gitignore` (mentor-scaffold `ml/artifacts/.gitkeep` pattern implies large binaries should not be committed — verify `.gitignore` covers `*.joblib` before the first real training run commits one accidentally).

---

## 6. Dependency Graph (both milestones)

```
Pre-Work (conflict resolution)
   │
   ▼
M2 Phase A (DB migrations) ──► M2 Phase B (ML pipeline) ──► M2 Phase C (backend services)
                                                                   │
                                                                   ▼
                                                          M2 Phase D (CDS + API wiring)
                                                                   │
                                                                   ▼
                                                          M2 Phase E (frontend)
                                                                   │
                                                                   ▼
                                                          M2 Phase F (docs/submit)
                                                                   │
                                                                   ▼
   M3 Phase A (DB) ──► M3 Phase B (treatment) ──┐
                    └─► M3 Phase C (analytics) ──┼──► M3 Phase D (research) ──► M3 Phase E (reporting)
                                                  │                                    │
                                                  ▼                                    ▼
                                          M3 Phase F (frontend) ◄──────────────────────┘
                                                  │
                                                  ▼
                                          M3 Phase G (docs/submit)
```

M3 Phases B and C can be developed in parallel (both depend only on M3 Phase A); Phase D depends on neither but is sequenced after B/C here because it's lower-risk/lower-effort and benefits from being tackled once the developer is "warmed up" on the analytics query patterns from Phase C.

---

## 7. Git Strategy

Per `INTERN_GUIDE.md` (binding, highest precedence for process rules):

### Branch strategy
- Continue on `intern/19-niyati-r` (already correctly named/active) as the umbrella branch, or cut feature sub-branches `intern/19-niyati-r/risk-prediction`, `intern/19-niyati-r/readmission-prediction`, `intern/19-niyati-r/cds-engine`, `intern/19-niyati-r/analytics`, `intern/19-niyati-r/treatment-effectiveness`, `intern/19-niyati-r/research-export`, `intern/19-niyati-r/reporting` if the intern prefers per-feature branches — either is compliant since both are still under the `intern/19-niyati-r` prefix.
- Never branch toward `main`; never open a PR (Branch Guard will auto-fail it).

### Commit sequence (illustrative, matches the file order in §2-3)

```
feat(db): add model_metadata table
feat(db): extend risk_predictions for readmission + outcome tracking
feat(ml): read training data from PostgreSQL instead of raw CSV
feat(ml): add India Hospital Readmission cleaning path
feat(ml): version model artifacts and register in model_metadata
feat(ml): correct promotion thresholds to match ML design doc
feat(backend): add model loader and feature builder services
feat(risk): implement real risk scoring against trained model
feat(risk): implement risk history and high-risk list endpoints
feat(readmission): implement readmission prediction service and endpoint
feat(readmission): implement outcome feedback logging
feat(db): add care_recommendations table
feat(cds): implement rule-based recommendation engine
feat(cds): wire recommendations and discharge-checklist endpoints
test(risk): add endpoint and service tests
test(readmission): add endpoint and service tests
test(cds): add recommendation engine tests
feat(frontend): add risk distribution and trend charts
feat(frontend): add risk and recommendations card to patient detail
feat(frontend): add hospital administrator analytics dashboard
docs(milestone-2): fill in milestone report

--- Milestone 3 ---

feat(db): add department column to admissions
feat(db): add reports table and outcome summary materialized view
feat(treatment): implement treatment effectiveness service and repository
feat(treatment): wire treatment effectiveness endpoints
feat(analytics): implement analytics aggregation service
feat(analytics): wire analytics endpoints
feat(research): wire anonymised patient export with cohort-size guard
feat(reporting): implement CSV report generation
test(treatment): add service and endpoint tests
test(analytics): add aggregation correctness tests
test(research): add anonymisation and cohort-guard tests
feat(frontend): add treatment effectiveness and department tabs
feat(frontend): add researcher-specific dashboard view
docs(milestone-3): fill in milestone report
```

Each commit is one logical change, imperative mood, `type(scope): what changed` — matches `INTERN_GUIDE.md:394-424` exactly and the style already used in the existing git log (`feat(auth): implement authentication and role based access control`, etc.).

### Milestone checkpoints
- After M2 Phase F: confirm CI green, milestone-2.md filled in with all 5 required headings and real metrics (accuracy/precision/recall/F1/ROC-AUC), push, notify mentor per submission process.
- After M3 Phase G: same, for milestone-3.md.

### Testing checkpoints
- After each phase in §2/§3: run `pytest backend/tests/` and `pytest ml/tests/` locally before moving to the next phase — do not accumulate untested code across phase boundaries, since later phases depend on earlier ones behaving correctly (e.g., Phase C's `RiskService` is untestable in isolation if Phase B never produced a real model artifact).

---

*End of HealthForecastAI_Implementation_Roadmap.md*
