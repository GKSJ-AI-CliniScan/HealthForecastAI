# Neon PostgreSQL Database Guide — HealthForecast AI

This guide covers setting up, configuring, migrating, and connecting the serverless [Neon PostgreSQL](https://neon.tech) database for HealthForecast AI.

---

## 1. Overview & Architecture

- **Database Engine**: PostgreSQL 16
- **Architecture**: Serverless architecture with separation of compute and storage.
- **Auto-Suspending**: Compute automatically suspends during idle periods and resumes in milliseconds.
- **Connection Security**: Enforced TLS/SSL encryption (`sslmode=require`).
- **Connection Pooling**: Built-in PgBouncer pooling for handling high concurrency from FastAPI workers.

---

## 2. Step-by-Step Neon Database Setup

### Step 1: Create a Neon Account & Project
1. Go to [Neon.tech](https://neon.tech) and sign in.
2. Click **Create Project**.
3. Name your project: `healthforecast-ai-db`.
4. Select Postgres version: `PostgreSQL 16`.
5. Select Region: Choose the region nearest to your Render web service (e.g., `US East (Ohio)` or `US East (N. Virginia)`).
6. Click **Create Project**.

### Step 2: Retrieve the Connection String
In the Neon Console **Dashboard**:
1. Locate the **Connection Details** section.
2. Select database `neondb` and role `neondb_owner`.
3. Choose **Pooled connection** (recommended for production web services).
4. Copy the connection string. It will look like:
   ```text
   postgresql://alex:AbCdEf123456@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

> **Important**: HealthForecast AI uses SQLAlchemy 2.0 with the modern `psycopg` (psycopg3) driver. The application's configuration layer automatically maps `postgresql://` to `postgresql+psycopg://` at runtime.

---

## 3. Database Schema Migration

To apply all schema tables, indexes, and constraints to Neon:

### Option A: From Local Machine
1. Export the Neon connection string:
   ```bash
   # Linux / macOS
   export DATABASE_URL="postgresql+psycopg://<username>:<password>@<neon-host>/neondb?sslmode=require"

   # Windows PowerShell
   $env:DATABASE_URL="postgresql+psycopg://<username>:<password>@<neon-host>/neondb?sslmode=require"
   ```
2. Run Alembic migrations:
   ```bash
   alembic upgrade head
   ```

### Option B: From Render Build / Release Step
In Render's build or pre-deploy step:
```bash
alembic upgrade head
```

---

## 4. Seeding Initial Healthcare Data

To populate initial administrative roles, sample doctors, and synthetic patients:
```bash
python backend/app/db/seed.py
```
This populates:
- Core administrative accounts (`admin@healthforecast.ai`)
- Clinical practitioners (`doctor@healthforecast.ai`)
- Healthcare researchers (`researcher@healthforecast.ai`)
- Initial synthetic hospital encounters and patient cohorts for readmission analysis.

---

## 5. Security & Best Practices

1. **Strict SSL Mode**: Neon rejects any non-SSL connection. Ensure `sslmode=require` is present in the connection string parameters.
2. **Pooled Endpoints**: Use the `-pooler` hostname for FastAPI web requests to avoid exhausting PostgreSQL client connection limits during traffic spikes.
3. **Database Branching**: Use Neon branches (e.g., `staging`, `preview`) to test schema migrations in isolation without risking production patient data.
4. **Credential Rotation**: Never hardcode credentials in source code. Rotate passwords through the Neon console and update Render's `DATABASE_URL` environment variable immediately.
