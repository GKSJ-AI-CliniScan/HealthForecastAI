# Deployment runbook

What runs, how to bring it up, how to put it on a server, and how to get back.

**Status, stated plainly.** The stack is containerised and has been built and run
locally with Docker Compose. There is **no live cloud deployment** yet: that needs a
cloud account and credentials that belong to the project owner, and none were
available. The steps below are the ones to run when they are; the release workflow
is written and skips itself until a host is configured.

## What runs

| Service | Image | Notes |
|---|---|---|
| `postgres` | postgres:16-alpine | Clinical data. Published only in development |
| `mongodb` | mongo:7 | Reserved for the model registry and monitoring |
| `migrate` | backend image | One-shot `alembic upgrade head`; the API waits for it |
| `backend` | built from `backend/` | FastAPI on 8000; the model is mounted read-only at `/models`, never baked in |
| `frontend` | built from `frontend/` | Next.js standalone on 3000 |
| `nginx` | nginx:1.27-alpine | Production only: the single published port |

Two things that are easy to get wrong:

- **`NEXT_PUBLIC_API_BASE_URL` is compiled into the frontend at build time.** Changing
  it in a running container does nothing. It is a build argument.
- **The trained model is not in git or in the image.** It is produced by
  `python -m src.models.train` and mounted from `ml/artifacts/`. Without it the API
  starts but reports `model_loaded=false` and the risk endpoints say so.

## Development

```bash
cp .env.example .env                      # then edit; never commit it
docker compose up -d --build
# one-off, from a Python 3.11 venv on the host (pip install -r ml/requirements.txt),
# with DATABASE_URL pointing at localhost:5432:
(cd ml && python -m src.data.etl && python -m src.models.train && python -m src.models.score)
curl http://localhost:8000/health         # {"status":"ok",...}
```

Frontend: <http://localhost:3000>. API docs: <http://localhost:8000/docs> (only when
`DEBUG=true`).

## Production, on any Linux VM with Docker

1. Create the VM (any cloud). Open ports 80 and 443 only; 22 from your address.
   Install Docker and Compose.
2. Clone the repository to `/opt/healthforecast`.
3. Create `/opt/healthforecast/.env`, mode 600, from your secret store:

   ```
   SECRET_KEY=<python -c "import secrets; print(secrets.token_urlsafe(48))">
   POSTGRES_PASSWORD=<random>
   PUBLIC_ORIGIN=https://your.domain
   ```
4. Put the trained `readmission_model.joblib` in `ml/artifacts/` on the host
   (copy it from wherever it was trained; it is deliberately not in git).
5. Start it:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

   Compose refuses to start without the three values above, and the API refuses to
   start with a default secret, `DEBUG=true` or wildcard CORS.
6. **TLS.** `deployment/nginx/nginx.conf` listens on port 80. Terminate TLS in front
   of it (a cloud load balancer, or certbot on the host) before real data goes near it.
   HSTS is already sent.
7. Load data and create the first admin once: run the ETL, the scorer and
   `python -m app.db.init_db` as in development, with `SEED_PASSWORD` set to a value
   you choose and then change.
8. Verify: `curl https://your.domain/health`, then run
   `E2E_BASE_URL=https://your.domain E2E_PASSWORD=... pytest tests/e2e`.

### Deploying from GitHub Actions

`.github/workflows/deploy.yml` (manual trigger) verifies the branch, builds both
images and, if these exist, releases over SSH and health-checks the result:

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_HOST`, `DEPLOY_USER` | The VM and an SSH user that can run docker |
| Secret | `DEPLOY_SSH_KEY` | A deploy-only private key |
| Secret | `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan -t ed25519 <host>` (pins the host key) |
| Variable | `DEPLOY_PATH` | Clone location, default `/opt/healthforecast` |
| Variable | `PUBLIC_URL` | Address for the post-deploy health check |

With none of them set the release job prints what to add and exits green.

## Rollback

```bash
cd /opt/healthforecast
git checkout <previous-commit>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Migrations are not auto-reverted. If a release added a migration that must go, run
`docker compose run --rm migrate alembic downgrade -1` **before** switching code back,
and take a database backup first (`pg_dump`). Model rollback is a file swap in
`ml/artifacts/` followed by `POST /api/v1/models/reload`.

## Pre-deploy checklist

- [ ] `ENVIRONMENT=production`, `DEBUG=false` (enforced at startup)
- [ ] `SECRET_KEY` is fresh, from the secret store (enforced: 32+ characters)
- [ ] Neither database is published on a host port (the production overlay removes them)
- [ ] `BACKEND_CORS_ORIGINS`/`PUBLIC_ORIGIN` is your real origin (enforced: no `*`)
- [ ] TLS terminates in front of nginx
- [ ] `GET /health` returns 200 through the public address
- [ ] The seed passwords have been changed; demo accounts removed or disabled
- [ ] No credential is in an image, the repository or a build log
- [ ] A database backup exists and a restore has been tried once
- [ ] The data protection position for real patient data has been decided by the
      data controller: this software is a reference implementation, not a certified
      medical device, and it has not been clinically validated

## Not done

- A live cloud URL (needs the owner's cloud account).
- Managed secrets, backups and monitoring on a cloud provider.
- Horizontal scaling: the API is stateless apart from the loaded model, so several
  instances behind a load balancer will work, but this was not exercised.
