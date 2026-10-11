# Database

Two stores were planned. One was built.

| Store      | Holds | Status |
|------------|-------|--------|
| PostgreSQL | Users, patients, admissions, predictions, treatment outcomes, audit logs | **In use** (Render in production, SQLite for local development) |
| MongoDB    | Clinical notes, model runs, prediction events | **Not implemented** - see below |

## PostgreSQL

- `postgres/schema/01_schema.sql` - reference schema. It is generated from
  `backend/app/models/` (see below) so the two always agree.
- `postgres/migrations/` - empty. Tables are created from the SQLAlchemy models at
  startup; no Alembic revisions were written.
- `postgres/seeds/` - empty. Synthetic demo data is loaded by
  `backend/scripts/seed_demo_data.py`.

The backend uses SQLAlchemy, so the same code runs on SQLite and Postgres. Only
`DATABASE_URL` changes.

Regenerate the reference schema after any model change:

```bash
cd backend
python scripts/export_schema.py
```

Bootstrap and utility scripts in `backend/scripts/`: `seed_admin.py` (first admin),
`seed_demo_data.py`, `migrate_sqlite_to_postgres.py`, `reset.py` (development only).

## MongoDB

`mongodb/schemas/collections.md` documents the intended collections. They were not
built. The model registry reads model files and `metrics.joblib` from
`MODEL_ARTIFACT_DIR`, and predictions are stored in the PostgreSQL
`risk_predictions` table. The relational tables covered every feature.

## Rules

- The reference schema and `backend/app/models/` must agree. If you change one,
  change the other in the same commit.
- Seed data is synthetic. Never seed from a real hospital extract.
- Never commit `DATABASE_URL` or any password.