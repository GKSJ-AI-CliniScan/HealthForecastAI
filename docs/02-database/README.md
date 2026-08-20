# Database design

The reference schema lives in
[`database/postgres/schema/01_schema.sql`](../../database/postgres/schema/01_schema.sql)
and the MongoDB collections in
[`database/mongodb/schemas/collections.md`](../../database/mongodb/schemas/collections.md).

## Deliverable for milestone 1

- An ER diagram covering `users`, `patients`, `admissions`, `risk_predictions`,
  `treatment_outcomes` and `audit_logs`.
- Which columns you indexed and why.
- How the Diabetes 130-US Hospitals columns map onto these tables.
- How a doctor's "assigned patients only" scope is enforced in a query.

## Notes that matter

- `patients` holds a de-identified medical record number. No names, addresses,
  phone numbers or exact dates of birth belong in this schema.
- `audit_logs` is append only. Never update or delete a row.
- Encounters where the patient died or entered hospice cannot be readmitted.
  Leaving them in the training set leaks the target - handle this explicitly.
