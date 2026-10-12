# Database

Two stores, deliberately split.

| Store      | Holds | Why |
|------------|-------|-----|
| PostgreSQL | Users, patients, admissions, predictions, treatment outcomes, audit logs | Relational integrity, constraints, joins for analytics |
| MongoDB    | **Provisioned but not used by the application** (planned for clinical notes, model runs, prediction events) | See [`docs/02-database`](../docs/02-database/README.md#8-mongodb) |

## PostgreSQL

- `postgres/schema/01_schema.sql` - reference schema, applied automatically by
  `docker compose up` on a fresh volume. It matches migration head `0005` but
  does not create `alembic_version`, so a database it initialised cannot be
  upgraded with `alembic upgrade head` (see
  [`docs/02-database`](../docs/02-database/README.md#6-setting-up-a-database-and-the-sql-versus-alembic-conflict)).
- `postgres/migrations/` - empty. The Alembic revisions (`0001` to `0005`) are in
  `backend/alembic/versions/`. Generate them from `backend/`, never hand-edit a
  shipped revision.
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
