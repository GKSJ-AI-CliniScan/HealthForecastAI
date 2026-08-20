# HealthForecast AI - Backend (FastAPI)

Python service that exposes authentication, patient data, risk prediction,
treatment effectiveness, clinical decision support, analytics and model
management APIs.

## Layout

| Path                     | Responsibility |
|--------------------------|----------------|
| `app/main.py`            | Application entrypoint, CORS, router mounting, `/health` |
| `app/core/config.py`     | Environment driven settings |
| `app/core/security.py`   | Password hashing and JWT issue/decode |
| `app/core/rbac.py`       | Roles, permissions and the access matrix |
| `app/api/deps.py`        | `get_current_user`, `require_permission`, `require_role` |
| `app/api/v1/endpoints/`  | One file per module from the brief |
| `app/models/`            | SQLAlchemy ORM models |
| `app/schemas/`           | Pydantic request/response models |
| `app/services/`          | Business logic - keep routers thin |
| `app/repositories/`      | Database access helpers |
| `alembic/`               | Database migrations |
| `tests/`                 | Pytest suite |

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload
```

Open <http://localhost:8000/docs>.

## Checks that CI runs

```bash
ruff check .
black --check .
pytest --cov=app --cov-report=term-missing
```

Run all three before you push - CI runs exactly these commands.

## Rules

- Every new endpoint declares a permission with `require_permission(...)`.
  An endpoint without an authorisation dependency will fail review.
- Never log, return, or commit real patient identifiers.
- `tests/test_rbac.py` encodes the access matrix from the brief. If your change
  breaks it, fix your change - not the test.
