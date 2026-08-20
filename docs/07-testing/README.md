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
