# Database

Two stores, deliberately split.

| Store      | Holds | Why |
|------------|-------|-----|
| PostgreSQL | Users, patients, admissions, predictions, treatment outcomes, audit logs | Relational integrity, constraints, joins for analytics |
| MongoDB    | Clinical notes, model runs, prediction events | Schema-light documents that change shape as the project grows |

## PostgreSQL

- `postgres/schema/01_schema.sql` - reference schema, applied automatically by
  `docker compose up` on a fresh volume.
- `postgres/migrations/` - Alembic revisions. Generate them from
  `backend/`, never hand-edit a shipped revision.
- `postgres/seeds/` - development seed data. Synthetic rows only.

```bash
cd backend
alembic revision --autogenerate -m "add treatment outcomes"
alembic upgrade head
```

## MongoDB

`mongodb/schemas/collections.md` documents the shape of every collection.

## Rules

- The reference schema and `backend/app/models/` must agree. If you change one,
  change the other in the same commit.
- Seed data is synthetic. Never seed from a real hospital extract.
