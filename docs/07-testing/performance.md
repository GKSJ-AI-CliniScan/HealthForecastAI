# Performance

Measured on a developer laptop (Windows, Docker Desktop, 12 logical CPUs), with the
load generator running on the same machine and competing for the same CPUs. The
absolute numbers will be better on a dedicated host; the **relative** changes are the
useful part. Data: 62,991 patients, 125,982 stored predictions.

Reproduce:

```bash
python scripts/loadtest.py --password '<seed password>' --concurrency 20 --seconds 30
```

The mix is weighted like a working day (dashboards and patient lists dominate,
heavy reports are rare) across three roles. Errors were **0 in every run**.

## Load test, concurrency 20, 30 seconds

| Stage | Throughput | p50 | p95 | Risk prediction p50 |
|---|---|---|---|---|
| Baseline: one worker | 11.9 req/s | 1,032 ms | 8,741 ms | 9,093 ms |
| + batched explanation, 4 workers | 18.4 req/s | 812 ms | 2,860 ms | 726 ms |
| + report cache (60 s) | **27.7 req/s** | **434 ms** | **2,291 ms** | 597 ms |

What each change was:

1. **A prediction was the slowest call on the API (9 s at load).** Explaining one
   patient's score ran the whole model pipeline about fifty times, one factor at a
   time. The variants are now scored in a single batched call; the result is
   identical (a test re-scores one factor directly and compares).
2. **Scoring is CPU-bound, so one process is one core.** The container now starts
   four uvicorn workers (`WEB_CONCURRENCY`).
3. **The hospital dashboards recomputed whole-table aggregates on every page view.**
   Whole-hospital reports are cached for 60 seconds (`CACHE_TTL_SECONDS`). The cache
   sits below the permission check and the audit write, keys on role and (for a
   doctor) user id so nobody sees another caseload, and is off in tests.

## Single-request timings (no other load)

| Endpoint | Time |
|---|---|
| Sign in (bcrypt) | ~0.33 s |
| Patient list, 25 rows | 0.06 s |
| Care recommendations for a patient | 0.02 s |
| Real-time risk prediction with explanation | 0.13-0.19 s |
| Trend chart / dashboard, first call | ~0.2-0.4 s |
| Same, served from the report cache | ~0.01 s |
| Hospital performance CSV export | 1.6 s first, 0.02 s cached |
| Research dataset export (63k rows, k-anonymised) | ~3 s (not cached) |

## A finding about the first request

Right after a bulk load the first dashboard request took 5-6 s, against 0.2 s warm.
The likely cause is that PostgreSQL had no statistics for the freshly loaded tables
(the times dropped to normal after an `ANALYZE`). The ETL and the scorer
now run `ANALYZE` when they finish, and a composite index
`(patient_id, id)` backs the "latest prediction per patient" join used by nearly
every dashboard.

## What this does not tell you

- It is a smoke-level test from one machine, not a capacity plan.
- The tail (p95 2.3 s) is dominated by the first computation of each cached report
  in each of the four workers, plus the load generator sharing the CPU. Warming the
  cache after a data load would flatten it; that is not implemented.
- The two exports are unpaginated and built in memory. Fine at this size; at
  millions of rows they need streaming.
- The cache is per process, so two workers can differ by up to one TTL.
- Frontend responsiveness was checked for build health and bundle size (largest
  page 222 kB first-load JS); no browser-level performance measurement was made.
