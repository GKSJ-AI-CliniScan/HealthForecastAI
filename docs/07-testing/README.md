# Testing

## What CI runs on every push

| Layer | Command |
|-------|---------|
| Backend lint | `ruff check .` in `backend/` |
| Backend format | `black --check .` in `backend/` |
| Backend tests | `pytest --cov=app` in `backend/` |
| Frontend lint | `npm run lint` in `frontend/` |
| Frontend build | `npm run build` in `frontend/` |
| Frontend types | `npm run typecheck` in `frontend/` |
| ML lint | `ruff check .` in `ml/` |
| ML tests | `pytest` in `ml/` |
| Repository checks | `scripts/ci/check_*.py` |
| Docker | `docker build` for backend and frontend, `docker compose config` |

Run the same commands locally before you push. See
[`INTERN_GUIDE.md`](../../INTERN_GUIDE.md).

## What to test

**Backend** - every endpoint gets at least three tests: the happy path, the
unauthenticated case (`401`), and the wrong-role case (`403`).

**ML** - test the transformations, not the model's accuracy. A unit test that
asserts `roc_auc > 0.7` will flake. Test that preprocessing handles missing
values, that the target binarisation is correct, and that risk banding matches
the backend.

**Frontend** - test that a role only renders what it is allowed to see.

## Rules

- A test that never fails is not a test. Make it fail once before you trust it.
- Never write a test against real patient data. Use synthetic fixtures.
- Do not lower a threshold or delete an assertion to make CI green. Fix the code,
  or raise it with your mentor.

## Deliverable for milestone 4

A test plan in this folder: what is covered, what is not, coverage percentage,
and the validation results for the final model.

---

## Project documentation (HealthForecast AI)

### What CI runs

| Layer | Command |
|---|---|
| Backend lint, format, types | `ruff check .`, `black --check .`, `mypy` in `backend/` |
| Backend tests | `pytest --cov=app` (CI provides a Postgres service) |
| Frontend | `npm run lint`, `npm run typecheck`, `npm run build` |
| ML | `ruff check .` in `ml/` |
| Repository policy | `scripts/ci/check_*.py`, branch name, milestone report structure |

### Covered

| Area | Tests |
|---|---|
| RBAC | Each protected endpoint returns 401 without a token and 403 for the wrong role |
| Risk | Risk banding uses the configured thresholds; unknown patient returns 404 |
| Treatment | Invalid treatment type is rejected |
| Analytics | Summary and distributions return the expected shape |
| Research | Anonymised cohort has no ID, MRN or doctor field |

Result: [n] tests passing, coverage [x]%. [Paste the last lines of `pytest --cov=app`.]

### Not covered

- Frontend component tests: none. Role-based navigation was checked manually.
- Load and response-time testing: not performed.
- ML tests check pipeline code only, not model accuracy (accuracy asserts are flaky).

### Manual end-to-end checks

| Check | Result |
|---|---|
| Log in as each of the four roles | [pass] |
| Doctor sees only assigned patients | [pass] |
| Researcher cannot see patient identifiers | [pass] |
| Predict risk, then see it on the high-risk list | [pass] |
| System admin creates and deactivates a user | [pass] |
| Live Render frontend logs in against the live backend | [pass, date] |

Fill each result from what you actually saw.

### Model validation

| Item | Value |
|---|---|
| Split | Train / validation / untouched test |
| Models compared | Logistic regression, random forest, XGBoost |
| Selection | Best F1 among models with ROC-AUC >= 0.60 and recall >= 0.50 |
| Threshold | Best F1 with recall >= 0.50 |
| Test ROC-AUC, recall, precision, F1 | [from `metrics.joblib`] |
| Base readmission rate | about 11% |

The model was evaluated only on this public dataset. It is not clinically validated.
The brief's ROC-AUC target is 0.65; state clearly whether the final model met it.

### Data fixes found during testing

- Gender values "F", "Female", "FeMale" were normalised.
- Predictions saved for patients that did not exist were removed, and a 404 guard was added.
- A threshold bug flagged every patient as high risk; fixed by choosing the threshold for best F1 under a recall floor.