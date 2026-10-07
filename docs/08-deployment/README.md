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
