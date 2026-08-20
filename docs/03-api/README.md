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
