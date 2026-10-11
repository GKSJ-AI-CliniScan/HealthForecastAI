# Deployment runbook

Templates and provider notes live in
[`deployment/`](../../deployment/). This folder holds *your* runbook: what you
actually deployed, where, and how to bring it back up.

## Deliverable for milestone 4

1. **Live URLs** - frontend, backend, `/docs`.
2. **Provider and services** - which of AWS or Azure, and which services.
3. **Deploy steps** - the exact commands you ran, in order, from a clean state.
4. **Environment variables** - names and where each value comes from. Never the
   values themselves.
5. **Rollback** - how to get back to the previous version.
6. **Evidence** - screenshots of the running platform and a passing health check.

## Pre-deploy checklist

- [ ] `DEBUG=false`
- [ ] `SECRET_KEY` is a freshly generated random value, from the secret store
- [ ] Database is not publicly reachable
- [ ] CORS lists only your real frontend origin, not `*`
- [ ] `GET /health` returns 200 through the load balancer
- [ ] No credential is present in the image, the repository, or a build log

---

## Project documentation (HealthForecast AI)

### Live URLs

| Service | URL |
|---|---|
| Frontend | <https://healthforecastai-1.onrender.com> |
| Backend API | <https://healthforecastai-sarj.onrender.com/api/v1> |
| API docs | <https://healthforecastai-sarj.onrender.com/docs> |

### Provider and services

Render (two Docker web services and a managed PostgreSQL database). Render was used
instead of AWS or Azure because it deploys directly from the GitHub branch at no cost.
[Tell your mentor this differs from the brief.]

### Deploy steps

1. In Render, create a PostgreSQL database and copy its Internal Database URL. Change the prefix to `postgresql+psycopg://`.
2. Push the branch to GitHub: `git push origin intern/24-parimala-m`.
3. Render > New Web Service > connect the repo, branch `intern/24-parimala-m`, root `backend`, runtime Docker. Add the backend variables below.
4. Wait for the build, then open `/docs` to confirm.
5. Create the first admin: run `python scripts/seed_admin.py` with `DATABASE_URL` set (Render shell or local).
6. Render > New Web Service > same repo, root `frontend`, runtime Docker. Set `NEXT_PUBLIC_API_URL` to the backend API base. It is read at build time, so redeploy after changing it.
7. Open the frontend URL and log in.

The model files must be inside the backend image: they are committed under
`backend/model_artifacts/` with `git add -f`, and `MODEL_ARTIFACT_DIR` points there.

### Environment variables (names only)

| Name | Service | Source |
|---|---|---|
| `DATABASE_URL` | Backend | Render PostgreSQL URL |
| `SECRET_KEY` | Backend | Random value, e.g. `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `MODEL_ARTIFACT_DIR` | Backend | Path of the model folder inside the image |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |

### Rollback

Render > the service > Events > pick the last good deploy > Rollback. Or
`git revert <commit>` and push. Take a database backup from the Render dashboard before risky changes.

### Pre-deploy checklist

- [ ] `DEBUG=false`
- [ ] `SECRET_KEY` freshly generated, not shared in chat or committed
- [ ] Any old database password that was shared in chat is rotated or the old database deleted
- [ ] CORS lists only the real frontend origin [confirm]
- [ ] `GET /health` returns 200 [confirm the route exists]
- [ ] No credential in the image, repository or build logs

### Known limits

Render's free tier sleeps when idle; the first request can take about a minute.
Render's free Postgres has storage and expiry limits.

### Evidence

`../06-milestones/evidence/health.png` (health check) and screenshots in `../06-milestones/evidence/`.