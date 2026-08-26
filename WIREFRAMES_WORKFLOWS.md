# Milestone 1 Wireframes and Workflows

This document records the implementation-level wireframes for Milestone 1. The React routes and shared layout are the current UI realization of these flows.

## Staff authentication and role gateway

```text
Public Home -> Staff Login -> POST /api/v1/auth/login -> role dashboard
                         -> invalid credentials -> visible error
Authenticated session -> GET /api/v1/auth/me -> retain or clear session
```

## Doctor workflow

```text
Doctor Dashboard -> Patient Registry -> search/filter -> Patient Worksheet
       |                 |                    |
       +-> Add Patient --+                    +-> edit clinical record
                                              +-> add clinical note/treatment
```

## Hospital administrator workflow

```text
Hospital Dashboard -> Hospital Analytics -> Department Performance
                   -> Reports and export
```

Hospital administrators can read clinical registry data and dashboard analytics. Clinical note and treatment writes are restricted by the backend RBAC matrix.

## Healthcare researcher workflow

```text
Researcher Dashboard -> Population Health -> Readmission Trends
                     -> Sanitized Dataset Catalog -> de-identified research data
```

Research routes expose de-identified analytics only. Identifiable patient registry routes are denied by backend authorization.

## System administrator workflow

```text
System Dashboard -> Users and Roles -> Dataset Registry
                 -> Audit Logs -> Settings
```

System administrator routes are protected by the `system-admin` role. Dataset registration records metadata; raw dataset import is documented separately in [DATASET_IMPORT.md](DATASET_IMPORT.md).

## Milestone boundary

Advanced risk prediction, treatment-effectiveness analytics, clinical decision support, AI model training, and deployment infrastructure remain later-milestone scope unless explicitly required by a Milestone 1 integration.
