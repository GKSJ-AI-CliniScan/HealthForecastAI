# Testing

This document is a test plan and an evidence summary. Every result is labelled
with how it is known:

| Label | Meaning |
|---|---|
| **Executed** | Run on the commit named in the row, with the output inspected |
| **Historical** | Recorded earlier (a log or an older report) and not re-run for this document |
| **Skipped** | Written but not run by default |
| **Reported** | Stated by a person, with no artifact in the repository |
| **Missing** | Not done |

Reference commit for the **Executed** rows: `7b99155` on branch
`intern/19-niyati-r`, run on 2026-10-12 on the Windows development machine
(Python 3.11 virtual environment, Node 24). Continuous-integration results are
not recorded here: they live in the GitHub Actions run history, which was not
available to this document.

## 1. Summary of evidence

| Layer | Result | Label | Notes |
|---|---|---|---|
| Backend (`backend/tests`) | **579 passed, 33 skipped, 0 failed** | Executed | The 33 skipped tests are the live end-to-end suite (section 5). The suite ran in several minutes on the development machine; earlier logs recorded about 40 seconds. |
| ML (`ml/tests`) | **148 passed, 0 failed** | Executed | 148 results in the progress output, none failing |
| Frontend (`frontend/src`) | **222 passed in 28 files** | Executed | Vitest with jsdom |
| TypeScript (`npm run typecheck`) | exit 0 | Executed | |
| ESLint (`npm run lint`) | exit 0 | Executed | |
| Repository checks (`scripts/ci/check_*.py`) | Syntax, files, secrets, notebooks, documentation links, milestone reports and branch naming pass. `check_structure` flags only a local untracked `.env` file, which Git ignores and a clean checkout would not contain. | Executed | Run 2026-10-12 after the documentation was written |
| Frontend production build (`npm run build`) | Passed with network access; failed with no network and no cache | Executed | The font is downloaded at build time (see [`docs/08-deployment`](../08-deployment/README.md)) |
| Backend 579 / ML 148 / frontend 192 figures quoted earlier in the project | Superseded | Historical | The frontend count rose to 222 with the later interface work |
| Backend coverage | Not measured in this run | Missing | "95%" in the Milestone 1 report dates from 2026-08-31 and is historical |
| Frontend coverage | Not configured | Missing | |
| End-to-end suite against a live server | Not run for this document | Skipped | No recorded result |
| Performance and load | None | Missing | SRS targets (2 s inference p95, 3 s dashboard p95) are unmeasured |
| Browser and responsive checks | Partial | Reported / Historical | Section 6 |

All unit tests run without PostgreSQL. The backend suite builds the schema in
an in-memory SQLite database (`backend/tests/conftest.py`), so database
behaviour that depends on PostgreSQL itself (for example the JSONB column, or
running Alembic against a real server) is not exercised by the automated suite.

## 2. Test strategy

- **Backend** (pytest): unit tests for services and repositories, API tests
  through FastAPI's test client with signed tokens, and schema tests that run
  the Alembic migrations up and down on a throwaway database and compare them
  with the models. Every endpoint family covers the happy path, the
  unauthenticated case (`401`) and the wrong-role case (`403`), and scope
  cases (`404` for another doctor's patient).
- **ML** (pytest): tests of the transformations, not of model accuracy: target
  binarisation, validation, preprocessing, feature engineering, artifact
  writing and promotion, metrics, risk banding, configuration, and the training
  pipeline on synthetic fixtures. Accuracy assertions are avoided because they
  would be flaky.
- **Frontend** (Vitest and Testing Library): pages and components rendered with
  mocked backend responses. They check that a role only renders what it may see,
  that the experimental-model wording and score captions are present, that the
  session helpers behave, and that charts keep their labels and thresholds.
- **Security and RBAC**: the access matrix is encoded in tests (section 3).
- **Fixtures** are synthetic. No real patient data is used in any test.

## 3. Backend coverage by area

Counts are test functions (parametrised tests expand into more executed cases,
which is why 579 results exceed 462 functions).

| Area | Files (functions) |
|---|---|
| Authentication and tokens | `test_auth.py` (24), `test_security.py` (4) |
| RBAC and authorisation | `test_rbac.py` (10), `test_authorization.py` (13) |
| Users | `test_users.py` (27) |
| Patients and admissions | `test_patients.py` (26), `test_admissions.py` (19), `test_repositories.py` (26) |
| Schema and migrations | `test_database_schema.py` (24) |
| Dataset import | `test_dataset_import.py` (47) |
| Risk, readmission and clinical support | `test_risk_endpoints.py` (18), `test_risk_service.py` (2), `test_risk_predictions_schema.py` (12), `test_ml_services.py` (13), `test_cds_endpoints.py` (11) |
| Model registry | `test_model_metadata.py` (11), `test_register_model.py` (28) |
| Treatment | `test_treatment.py` (27) |
| Analytics | `test_analytics.py` (28) |
| Research and anonymisation | `test_research_export.py` (28) |
| Reports | `test_reports.py` (34) |
| Health | `test_health.py` (3) |
| End-to-end regression (skipped by default) | `e2e/test_api_regression.py` (27 functions) |

The matrix tests pin the restrictions listed in
[`docs/04-rbac`](../04-rbac/README.md). They do not pin the contested cells
(hospital administrator risk reports, doctor analytics) described there.

## 4. ML tests and model evaluation

| Area | File (functions) |
|---|---|
| Data loading and target | `test_load_data.py` (6), `test_validate.py` (7), `test_preprocess.py` (14) |
| Features | `test_build_features.py` (11) |
| Training, artifacts, promotion | `test_train_pipeline.py` (23), `test_artifacts.py` (21) |
| Calibration and metrics | `test_calibrate.py` (9), `test_metrics.py` (16) |
| Configuration | `test_config.py` (10) |
| Relational export | `test_relational_export.py` (8) |

Model evaluation figures come from the metrics files written by the training
run on 2026-10-09 (`ml/artifacts/*_metrics.json`, not committed). They are
test-split results of a temporal split on the India Hospital Readmission export.
They are experimental and uncalibrated; see
[`docs/06-milestones/milestone-2.md`](../06-milestones/milestone-2.md).

| Model | Selected | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|---|
| Risk (death or readmission) | logistic regression | 0.637 | 0.269 | 0.592 | 0.370 | 0.656 |
| 30-day readmission | logistic regression | 0.687 | 0.237 | 0.669 | 0.350 | 0.741 |

The SRS target of ROC-AUC 0.75 for the readmission model is **not met**
(0.741), and the SRS target of F1 0.70 for the high-risk tier is not measured.
The promotion gate used in code is ROC-AUC 0.65 and recall 0.50, and the risk
model clears the AUC gate narrowly. Precision is low because positives are a minority (about 13% of test encounters for the readmission model and 18% for the risk model) and the models use class weighting.

## 5. Integration and end-to-end tests

- `backend/tests/e2e/test_api_regression.py` exercises a **running** backend and
  its database for each role. It skips unless `HFAI_E2E_BASE_URL` is set and
  one account per role is provided through environment variables
  (`HFAI_E2E_<ROLE>_EMAIL` and `HFAI_E2E_<ROLE>_PASSWORD` for the roles
  `SYSTEM_ADMIN`, `DOCTOR`, `HOSPITAL_ADMIN` and `RESEARCHER`; optionally
  `HFAI_E2E_DATABASE_URL`). It never stores credentials. Predictions it requests
  are kept, because predictions are append-only.
  **Status: Skipped by default; no recorded result.**
- `tests/integration/` and `tests/e2e/` at the repository root contain only
  placeholder files. The e2e tests live in `backend/tests/e2e/`.
- A full `docker compose up` followed by a sign-in and a prediction has not been
  recorded (see the open risks in [`docs/08-deployment`](../08-deployment/README.md)).

## 6. Browser and responsive verification

| Check | Status |
|---|---|
| Signed-out sign-in page: light, dark, desktop, tablet and phone widths; text contrast, overflow, console errors, external requests, notice present once | **Historical.** Scripted headless-browser runs on 2026-10-12 passed; scripts and screenshots are kept outside the repository. |
| Signed-in doctor and system-administrator pages during the interface redesign: 96 of 96 and 217 of 218 checks; the single miss came from a third-party antivirus script injected into the page, not from the application | **Historical.** Same location; the hospital administrator and researcher roles were not browser-checked. |
| Final interface (Forecast H mark, sidebar, theme toggle) | **Reported** by the project owner after manual review; no artifact. |
| Keyboard focus and touch targets | Implemented (global focus ring, 40 to 44 px targets); checked in code and in the scripted runs, not with assistive technology |
| Screen-reader behaviour | **Missing** (icons are hidden from assistive technology by design; no screen-reader run) |

## 7. Security tests

- Authorisation by role and scope: section 3.
- Password hashing, token creation and expiry: `test_security.py`, `test_auth.py`.
- Research anonymisation, minimum cohort and export audit:
  `test_research_export.py`.
- Spreadsheet-formula neutralisation in CSV: `test_research_export.py`.
- Report file path safety and retention: `test_reports.py`.
- Model integrity (sha256 recorded at training and checked at registration):
  `test_register_model.py`. No dedicated test of the loader's own pre-load check was found.
- Repository secret and file-policy scans: `scripts/ci/check_secrets.py` and
  `check_files.py`.
- Dependency and static analysis (`pip-audit`, `npm audit`, CodeQL): configured
  in `.github/workflows/security.yml`; results are not recorded here.

Not covered: penetration testing, TLS, rate limiting or lockout (not
implemented), and encryption at rest.

## 8. How to run everything

```bash
# Backend (in-memory database; no services needed)
cd backend && pytest -q
cd backend && pytest --cov=app --cov-report=term-missing        # with coverage

# ML
cd ml && pytest -q

# Frontend
cd frontend && npm test
cd frontend && npm run typecheck && npm run lint

# Repository checks (standard library only, from the repository root)
python scripts/ci/check_structure.py
python scripts/ci/check_syntax.py
python scripts/ci/check_files.py
python scripts/ci/check_secrets.py
python scripts/ci/check_notebooks.py
python scripts/ci/check_docs.py
python scripts/ci/check_milestones.py

# Optional end-to-end suite (needs a running backend and role accounts)
HFAI_E2E_BASE_URL=http://localhost:8000/api/v1 cd backend && pytest tests/e2e -q
```

What CI runs on every push: repository checks; backend `ruff`, `black --check`,
`mypy` (advisory) and `pytest` with coverage; frontend `npm run lint`,
`npm run build`, `npm run typecheck` and `npm test`; ML `ruff`, `black --check`
and `pytest`; and Docker image builds when Docker inputs change. Never lower a
threshold or delete an assertion to make CI pass.

## 9. Known gaps and risks

1. No current coverage number for any layer.
2. The automated tests do not run against PostgreSQL or through Docker.
3. The end-to-end suite has no recorded run.
4. No performance, load or concurrency measurement exists, so the SRS latency
   targets are unverified.
5. No test of model calibration (calibration is switched off by design) or
   clinical validity. The models are experimental.
6. The hospital administrator and researcher interfaces were not browser-checked
   during the interface work.
7. The SQL initialisation script and Alembic migrations are not compared by a
   test (see [`docs/02-database`](../02-database/README.md#6-setting-up-a-database-and-the-sql-versus-alembic-conflict)).
8. CI results for the current commit were not retrieved.
