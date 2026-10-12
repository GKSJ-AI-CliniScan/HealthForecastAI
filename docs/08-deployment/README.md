# Deployment runbook

This runbook covers running HealthForecast AI locally, in Docker Compose, and
what a cloud deployment would need. Templates and provider notes live in
[`deployment/`](../../deployment/).

## 0. Status at a glance

| Item | Status |
|---|---|
| Local development (backend, frontend, PostgreSQL) | Used throughout development. The documented commands below match the repository. |
| Docker images build (backend and frontend) | Configured; built in CI when Docker inputs change. The frontend build needs network access for fonts. |
| `docker compose up` from a clean volume through sign-in and a prediction | **Not verified.** Five risks are listed in section 7. |
| Cloud deployment (AWS or Azure) | **Not done.** The deploy workflow's release step is a deliberate placeholder (`.github/workflows/deploy.yml`). There is no live URL, and none is claimed here. |
| TLS, reverse proxy, secret store, monitoring | **Not configured.** An nginx template exists but is not wired into Compose. |
| Backups | A manual procedure is documented; no schedule exists. |

Nothing in this document was executed to write it. The commands come from the
repository's files and scripts; where behaviour is inferred rather than run, it
is marked **[inferred]**.

## 1. Prerequisites

| Tool | Version (as pinned or used) | Used for |
|---|---|---|
| Python | 3.11 (CI uses 3.11; a newer interpreter can behave differently) | Backend, ML, scripts |
| Node.js | 20 or newer; 22 in CI and the frontend image | Frontend |
| PostgreSQL | 16 (`postgres:16-alpine` in Compose) | Operational database |
| Docker Desktop | Any recent version | Optional: containers |
| Git | Any recent version | Source |

MongoDB is provisioned by Compose but not used by the application.

## 2. Environment variables

Copy the template and edit it. `.env` is ignored by Git and must stay that
way.

```bash
cp .env.example .env
```

| Variable | Purpose | Notes |
|---|---|---|
| `ENVIRONMENT` | `development`, `test` or `production` | `production` refuses to start with the placeholder anonymisation salt |
| `DEBUG` | Debug mode | Defaults to `true` in code and in the template. Set `false` outside development. |
| `SECRET_KEY` | Signs access tokens | The code has a development default and **nothing refuses to start with it**. Always set a fresh value: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ANONYMISATION_SALT` | Salt for researcher pseudonyms | Not in `.env.example`. Required in production (enforced). Keep separate from `SECRET_KEY`. |
| `RESEARCH_MIN_COHORT_SIZE` | Smallest cohort a researcher may see | Default 10 |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT` | Database settings used by Compose | Compose defaults the user and password to `postgres`. Override them. |
| `DATABASE_URL` | Backend database connection | Compose builds it for the container; for a local run set it yourself |
| `MONGO_URI`, `MONGO_DB` | MongoDB connection | Unused by the application |
| `BACKEND_CORS_ORIGINS` | Allowed browser origins | Comma separated; defaults to `http://localhost:3000`. Never `*` in production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | Default 30. The web session cookie uses the same 30 minutes. |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | Declared but not used | No refresh tokens exist |
| `MODEL_ARTIFACT_DIR` | Where model files live | Default `ml/artifacts`, resolved against the working directory. Use an absolute path to avoid ambiguity. |
| `ACTIVE_RISK_MODEL` | Declared but not read | The active model comes from the `model_metadata` registry |
| `RISK_THRESHOLD_MEDIUM`, `RISK_THRESHOLD_HIGH` | Band cut-offs (0.40 and 0.70) | Changing them changes bands only; the interface text and the saved history still describe 0.40 and 0.70 |
| `REPORT_STORAGE_DIR`, `REPORT_RETENTION_DAYS` | Where report files are stored, and how long they are kept | Defaults `storage/reports` and 30 |
| `NEXT_PUBLIC_API_BASE_URL` | Backend address used by the Next.js server | See risk 1 in section 7 |
| `NEXT_PUBLIC_APP_NAME` | Display name | Optional |

Never put a secret behind a `NEXT_PUBLIC_` name: those values are exposed to
browsers. Never commit `.env`, and never put credentials in an image layer, a
repository file or a build log.

## 3. Local run without Docker

```bash
# 1. Database: an empty PostgreSQL 16 database, with DATABASE_URL pointing to it.

# 2. Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
alembic upgrade head               # creates the nine tables (revision 0005)
uvicorn app.main:app --reload      # http://localhost:8000/docs

# 3. First account (the first registration becomes system administrator)
#    Register it immediately after the schema exists - see section 6.

# 4. Frontend (second terminal)
cd frontend
npm install
npm run dev                        # http://localhost:3000
```

Use an empty database for step 1 and do not initialise it with
`database/postgres/schema/01_schema.sql`: that script and Alembic do not mix
(section 7, risk 5, and
[`docs/02-database`](../02-database/README.md#6-setting-up-a-database-and-the-sql-versus-alembic-conflict)).

### Dataset (optional)

The datasets are never committed. Download steps are in
[`ml/data/README.md`](../../ml/data/README.md). Then load a sample, always
trying a dry run first:

```bash
python scripts/import_dataset.py ml/data/raw --profile india_hospital_readmission --limit 50 --dry-run
python scripts/import_dataset.py ml/data/raw --profile india_hospital_readmission --limit 50
```

A full load needs `--all` (86,400 patients) and must be asked for explicitly.

### Model artifacts

Models are trained offline and are **not in the repository or in the Docker
images**. Without a registered, verified model, `/risk/predict` and
`/risk/readmission` answer `503`.

```bash
cd ml && pip install -r requirements-dev.txt
python -m src.models.train --config configs/config.yaml     # writes ml/artifacts
cd ../backend && alembic upgrade head && cd ..
python scripts/register_model.py risk
python scripts/register_model.py readmission
```

Registration checks provenance, the recorded sha256, and that the model fits
the backend's feature builder, and makes the registered version the production
model (retiring the previous one). The backend verifies the sha256 again before
loading a model file. Keep the files at the registered location; the registry
stores the path.

## 4. Docker Compose

```bash
cp .env.example .env            # set real values first
docker compose up --build
```

| Service | Port | Health check |
|---|---|---|
| `postgres` (16) | 5432 | `pg_isready` |
| `mongodb` (7) | 27017 | `db.adminCommand('ping')` (the backend waits for it, but does not use it) |
| `backend` | 8000 | Image `HEALTHCHECK`: `curl /health` |
| `frontend` | 3000 | none defined |

Useful commands:

```bash
docker compose logs -f backend
docker compose down              # stop, keep data
docker compose down -v           # stop and DELETE the database and Mongo volumes
```

`docker compose down -v` destroys data. Take a backup first (section 8).

**Not verified:** that this stack starts cleanly, lets a user sign in and
serves a prediction. Read section 7 before relying on it.

## 5. Health checks

- `GET /health` returns `{"status": "ok", "service": ..., "environment": ...}`
  and is the liveness probe for Docker and for a load balancer. It does not
  check the database.
- `pg_isready` for PostgreSQL.
- A deeper smoke test after a deployment: open `/docs`, sign in through the web
  interface, load the dashboard, and request a score on a non-production
  patient. Predictions are stored permanently; do not generate them against
  real records.

## 6. Security precautions

- Set `ENVIRONMENT=production`, `DEBUG=false`, a fresh `SECRET_KEY` and a real
  `ANONYMISATION_SALT`.
- **Register the first administrator immediately.** The first account created on
  an empty database becomes `system_admin`, so an exposed new environment can be
  claimed by whoever registers first.
- Change the default database password (`postgres`) before exposing anything,
  and never publish port 5432 or 27017 to the internet.
- Put a TLS-terminating proxy in front of the web and API ports. The session
  cookie is marked `Secure` in production builds, so over plain HTTP on a host
  other than `localhost` the browser will not keep the session **[inferred]**.
  `deployment/nginx/nginx.conf` is a template with security headers but listens
  on port 80 only and is not part of Compose.
- Restrict `BACKEND_CORS_ORIGINS` to the real frontend origin.
- Remember that the application is an **experimental decision-support
  prototype**: it has not been clinically validated and must not be used for
  patient care, whatever the hosting.
- No refresh tokens, password reset, lockout, audit-log viewer or encryption at
  rest exist (see [`docs/03-api`](../03-api/README.md#not-implemented)).

## 7. Known risks in the container path

These were found by reading the repository, not by running it.

| # | Risk | Evidence | Effect |
|---|---|---|---|
| 1 | **Frontend to backend address.** Compose sets `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` for the frontend container, and all calls to the backend are made by the Next.js server inside that container. | `docker-compose.yml`; `frontend/src/lib/api.ts` (server side only) | **[inferred]** `localhost` inside the container is the container itself, so pages cannot reach the backend. The service name (`http://backend:8000/api/v1`) is the expected value, and the variable is also read at build time, so it may need to be a build argument. Not changed here. |
| 2 | **No model files in the backend container.** The backend image is built from `./backend`, and Compose mounts nothing for `ml/artifacts`. | `docker-compose.yml`, `backend/Dockerfile` | **[inferred]** Predictions return `503` until artifacts are provided (a volume, or an image that includes them) and registered. |
| 3 | **Report files are not persisted.** No volume is mounted for the report storage directory. | `docker-compose.yml` | **[inferred]** Reports vanish when the container is replaced, and their `reports` rows would point at missing files (download then returns `410`). |
| 4 | **MongoDB dependency.** The backend waits for MongoDB to be healthy, but the application never uses it. | `docker-compose.yml`, `backend/app/db/mongodb.py` | If MongoDB fails, the backend does not start, for no functional benefit. |
| 5 | **Database initialisation.** A new volume is initialised from `01_schema.sql` (all nine tables, no `alembic_version`); migration `0001` has no existence guard. | `docker-compose.yml`, `backend/alembic/versions/0001_initial_schema.py` | **[inferred]** `alembic upgrade head` fails on that volume with "already exists". A safe route would be `alembic stamp head` instead; not tried. |
| 6 | TLS and debug. `DEBUG` defaults to true; the nginx template has no TLS. | `backend/app/core/config.py`, `deployment/nginx/nginx.conf` | Insecure defaults if copied unchanged |
| 7 | Frontend build needs network. `next/font` downloads Atkinson Hyperlegible Next at build time. | Tested on 2026-10-12 with a copy of the frontend: a cold build with network access blocked fails with "Failed to fetch ... from Google Fonts"; a rebuild with a warm cache succeeded offline. | A Docker build behind a firewall without access to Google Fonts fails. The built site itself makes no font request at run time (fonts are served from the app). |

## 8. Backup and recovery

- Database backup: `pg_dump -Fc -U <user> -d <database> -f healthforecast.dump`.
- Inspect a dump without restoring it: `pg_restore --list healthforecast.dump`.
- Restore into a new, empty database: `createdb <new_database>` and then
  `pg_restore -U <user> -d <new_database> healthforecast.dump`. Never restore over
  data you want to keep.
- Report files live on disk (`REPORT_STORAGE_DIR`) and need a separate copy.
- Model files (`ml/artifacts`) are not in Git. Keep them, with their
  `metrics.json` files, in storage you control.
- Status: a dump of a development database was created and listed with
  `pg_restore --list`. A restore was never exercised, and no schedule exists.

## 9. Rollback

1. **Application:** redeploy the previous image tag, or check out the previous
   commit and rebuild. Image tags are per branch and commit in the manual
   deploy workflow.
2. **Schema:** `alembic downgrade -1` reverses one revision. The test suite runs
   a full upgrade and downgrade on a throwaway database, but a downgrade has not
   been run against the real database; take a dump first.
3. **Model:** register the previous version again with `scripts/register_model.py`
   (the previous model is retired, not deleted), or restore the registry from a
   dump.
4. **Data:** restore from the latest dump into a fresh database and repoint
   `DATABASE_URL`.

## 10. Troubleshooting

| Symptom | Likely cause and action |
|---|---|
| `503` from `/risk/predict` | No verified production model: train, then run `scripts/register_model.py`. Check `MODEL_ARTIFACT_DIR`. |
| `422` from a prediction with `missing_fields` | The patient or admission lacks data the model needs. |
| Login redirects back to `/login` | The cookie was not stored (HTTP in production mode), the token expired after 30 minutes, or the backend is unreachable. |
| Pages show "Backend unavailable" | The frontend cannot reach `NEXT_PUBLIC_API_BASE_URL`. |
| `alembic upgrade head` says a table already exists | The database was initialised by `01_schema.sql`. Use an empty database, or `alembic stamp head` **[inferred]**. |
| Backend will not start in Compose | MongoDB is unhealthy, or `DATABASE_URL`/password mismatch. |
| Backend exits with `ANONYMISATION_SALT must be set` | `ENVIRONMENT=production` without a real salt. |
| Frontend build fails to fetch a font | No network to Google Fonts and no build cache. |
| Browser blocked by CORS | `BACKEND_CORS_ORIGINS` does not list the frontend's origin. |
| Everyone is a doctor | Only the first registered account becomes administrator; promote others with `PATCH /users/{id}`. |

## 11. Cloud deployment (not done)

[`deployment/aws/`](../../deployment/aws/README.md) and
[`deployment/azure/`](../../deployment/azure/README.md) describe the intended
shape (containers, managed PostgreSQL, private networking, a secret store, a
load balancer with `/health`, a private model bucket). The **Deploy** workflow
verifies the branch, runs the backend tests and builds the images; with
`push_images` it publishes them to the GitHub Container Registry. Its release
step only writes a notice.

| Required by the brief for Milestone 4 | Status |
|---|---|
| Live frontend and backend URLs | None |
| Provider and services chosen | Not recorded |
| Exact deploy commands from a clean state | Not performed |
| Screenshots of the running platform and a passing health check | None |
| Load balancer or reverse proxy, TLS | None |

Until a deployment happens and is evidenced, the project must be described as
**container-ready in configuration, not deployed**.

## 12. Pre-deploy checklist

- [ ] `ENVIRONMENT=production` and `DEBUG=false`
- [ ] `SECRET_KEY` and `ANONYMISATION_SALT` are fresh random values from a secret store
- [ ] Database password changed; database not publicly reachable
- [ ] CORS lists only the real frontend origin
- [ ] TLS terminates in front of both services
- [ ] `GET /health` returns 200 through the load balancer
- [ ] Model artifacts present, registered and verified
- [ ] First administrator registered
- [ ] Backup taken and a restore tested
- [ ] No credential in an image, the repository or a build log
