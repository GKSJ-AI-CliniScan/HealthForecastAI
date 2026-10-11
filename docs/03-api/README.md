# API reference

The live, always-accurate reference is the generated OpenAPI schema:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Raw schema: <http://localhost:8000/api/v1/openapi.json>

## Route map

| Prefix | Module | Owner milestone |
|--------|--------|-----------------|
| `/api/v1/auth` | Authentication | 1 |
| `/api/v1/users` | User management | 1 |
| `/api/v1/patients` | Patient data | 1 |
| `/api/v1/risk` | Risk prediction and readmission forecasting | 2 |
| `/api/v1/treatment` | Treatment effectiveness | 3 |
| `/api/v1/clinical-support` | Clinical decision support | 3 |
| `/api/v1/analytics` | Healthcare analytics | 3 |
| `/api/v1/models` | AI model management | 4 |

## Conventions

- Version everything under `/api/v1`. Never break a shipped contract.
- Every endpoint declares an authorisation dependency. An endpoint without one
  will fail review.
- Return the correct status code: `401` for no or bad token, `403` for a valid
  token without the permission, `404` for a resource the caller may see but that
  does not exist. Do not use `404` to hide an authorisation failure unless you
  document why.
- Error bodies use FastAPI's `{"detail": "..."}` shape. Never leak a stack trace,
  a SQL string or a patient identifier in an error message.

## Deliverable for milestone 1

Document each endpoint you implement here: method, path, required permission,
request body, response body and error cases. Export the OpenAPI schema and
commit it alongside this file.

---

## Project documentation (HealthForecast AI)

Live reference (always accurate):

- Swagger UI: <https://healthforecastai-sarj.onrender.com/docs>
- Local: <http://localhost:8000/docs>

Generated files, produced by `python scripts/export_api_docs.py` from `backend/`:

- [`openapi.json`](openapi.json): the exported schema
- [`endpoints.md`](endpoints.md): table of every method and path

### Route map

| Prefix | Module | Main permission |
|---|---|---|
| `/api/v1/auth` | Login | Public |
| `/api/v1/users` | List, create, update, soft-delete users | User management |
| `/api/v1/patients` | Visible patients, create patient, `/anonymised` cohort | Patient read; research for `/anonymised` |
| `/api/v1/risk` | `POST /predict`, `GET /high-risk`, `GET /forecast` | Risk report read |
| `/api/v1/treatment` | Aggregates, recovery trends, patient history, CSV export | Treatment report read |
| `/api/v1/analytics` | Summary, readmissions, population health, CSV export | Analytics read |
| `/api/v1/clinical-support` | Care recommendations, discharge plan | Clinical support read |
| `/api/v1/models` | `/`, `/active`, `/metrics` | Model manage |

### Conventions

- Everything is under `/api/v1`.
- `401` no or bad token; `403` valid token without the permission; `404` missing resource; `422` invalid input.
- Errors use `{"detail": "..."}`. No stack traces or SQL in responses.
- Treatment types are limited to: insulin_therapy, metformin, sulfonylurea,
  lifestyle_intervention, oral_hypoglycemics, combination_therapy.

### Example: predict readmission risk

```
POST /api/v1/risk/predict
Authorization: Bearer <token>
```

Request body: the patient ID plus the seven model fields (see the schema in `/docs`).
Response: `probability`, `risk_category` (low, medium, high), model name and version.
Errors: 401, 403, 404 (unknown patient), 422 (field out of range).

[Add one request and one response copied from Swagger, using synthetic data.]