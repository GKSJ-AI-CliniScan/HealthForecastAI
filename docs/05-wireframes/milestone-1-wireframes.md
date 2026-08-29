# UI wireframes and workflow planning - Milestone 1

The brief asks for wireframes and workflow planning. The screens below are
implemented, so these are annotated layouts of what was built rather than
sketches of what might be.

Replace each block with a screenshot of the running app before submitting. Never
screenshot real patient data - the seeded dataset is public and de-identified,
which is why it is safe to capture.

---

## Screen 1 - Login (`/login`)

```
+------------------------------------------------------+
|                                                      |
|         +----------------------------------+         |
|         |  HealthForecast AI               |         |
|         |  Sign in to the readmission      |         |
|         |  risk platform                   |         |
|         |                                  |         |
|         |  Email                           |         |
|         |  [____________________________]  |         |
|         |                                  |         |
|         |  Password                        |         |
|         |  [____________________________]  |         |
|         |                                  |         |
|         |  [ error message, if any      ]  |         |
|         |                                  |         |
|         |  [        Sign in            ]   |         |
|         |                                  |         |
|         |  Access is role based.           |         |
|         +----------------------------------+         |
|                                                      |
+------------------------------------------------------+
```

The button stays disabled until both fields are filled. Errors render inside the
card with `role="alert"` rather than in a browser dialog. Credentials are never
checked in the browser.

---

## Screen 2 - Dashboard (`/dashboard`)

```
+---------------------------------------------------------------+
| HealthForecast AI                    [Doctor]  [ Sign out ]    |
| Dr Asha Verma                                                  |
+---------------------------------------------------------------+
| Overview                                        [ Refresh ]    |
| Your assigned patients            <- scope label from the API  |
|                                                                |
| +----------+ +------------+ +----------------+ +-------------+ |
| | Patients | | Admissions | | Readmitted <30 | | Avg stay    | |
| |   1,204  | |   1,876    | |      241       | |  4.4 days   | |
| |          | |            | | 12.8% of adms  | |             | |
| +----------+ +------------+ +----------------+ +-------------+ |
|                                                                |
| Patients                                                       |
| Rows are limited to what your role is permitted to see.        |
| +------------------------------------------------------------+ |
| | Record number | Age group | Gender | Primary diagnosis      | |
| |---------------|-----------|--------|------------------------| |
| | MRN8222157    | [70-80)   | Female | 250.83                 | |
| | MRN55629189   | [50-60)   | Male   | 410                    | |
| +------------------------------------------------------------+ |
+---------------------------------------------------------------+
```

The same component renders differently per role, because the server returns
different data:

| Role | Scope label | Table heading | First column |
|---|---|---|---|
| Doctor | Your assigned patients | Patients | Record number |
| Hospital Administrator | Hospital wide | Patients | Record number |
| Healthcare Researcher | Hospital wide | De-identified cohort | Cohort ID |
| System Administrator | Hospital wide | Patients | Record number |

---

## Screen 3 - API unreachable

```
+---------------------------------------------------------------+
| Overview                                        [ Refresh ]    |
|                                                                |
| +------------------------------------------------------------+ |
| | Could not reach the API                                    | |
| | Request to /patients/stats failed                          | |
| | Check that the backend is running on port 8000, then        | |
| | press Refresh.                                              | |
| +------------------------------------------------------------+ |
+---------------------------------------------------------------+
```

This state exists deliberately. There is no mock-data fallback: a dashboard that
renders invented numbers when the backend is down looks identical to a working
one, and that is how a broken integration survives a demo unnoticed.

---

## Workflow - signing in and loading the dashboard

```
User submits credentials
        |
        v
POST /auth/login  --> 401 on bad credentials, message shown in the card
        |
        v  token
GET /auth/me      --> role + permission list
        |
        +-- has patient:read_anonymized only? --> GET /patients/anonymised
        |
        +-- otherwise                         --> GET /patients
        |
        v
GET /patients/stats  (scoped server side)
        |
        v
Metrics + table render, labelled with the scope the server reported
```

The UI reads the server's permission list rather than deciding from the role
name. This is presentation only: a researcher calling `/patients` directly
receives 403 whatever the browser does. Hiding a button that would fail is a
convenience, not the thing keeping data safe.

---

## Not built yet

- Patient detail page. `GET /patients/{id}` returns encounter history; nothing
  consumes it.
- Charts. Recharts is installed; the readmission-rate trend is the obvious first
  one once Milestone 2 produces predictions.
- Pagination controls. The API accepts `offset`; the UI requests the first page.
- A risk column in the table. It attaches in Milestone 2.
