# Integration and end-to-end tests

Unit tests live next to the code they cover (`backend/tests/`, `ml/tests/`).
This folder is for tests that cross a boundary.

| Folder | Scope |
|--------|-------|
| `integration/` | Backend against a real PostgreSQL and MongoDB, started by `docker compose` |
| `e2e/` | Browser-level flows: log in as each role, confirm each sees only what it should |

## Running

```bash
docker compose up -d postgres mongodb
cd backend && pytest ../tests/integration
```

## Milestone 4 deliverable

At minimum, one end-to-end test per role that proves the access matrix holds
through the whole stack - not just in the unit tests.
