# Deployment

Milestone 4 deliverable: the platform runs in Docker locally and on a cloud
provider.

## Local (Docker Compose)

```bash
cp .env.example .env       # fill in real values
docker compose up --build
```

| Service   | URL |
|-----------|-----|
| Frontend  | <http://localhost:3000> |
| Backend   | <http://localhost:8000> |
| API docs  | <http://localhost:8000/docs> |
| Postgres  | `localhost:5432` |
| MongoDB   | `localhost:27017` |

Useful commands:

```bash
docker compose logs -f backend
docker compose exec backend alembic upgrade head
docker compose down -v          # -v also drops the database volumes
```

## Cloud

`aws/` and `azure/` hold the notes and templates for each target. Pick one -
you do not need both.

## Rules

- Secrets come from the platform secret store (AWS Secrets Manager, Azure Key
  Vault), never from a committed file and never from a Docker image layer.
- `DEBUG=false` and a real `SECRET_KEY` in every deployed environment.
- Only the reverse proxy is public. Postgres, MongoDB and the app containers
  stay on the private network.
