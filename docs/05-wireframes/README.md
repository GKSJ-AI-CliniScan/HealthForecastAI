# Wireframes

Milestone 1 deliverable: one wireframe per role, showing what that role sees
after login.

## Screens to cover

| Role | Screens |
|------|---------|
| Doctor | Assigned patient list, patient detail with risk score, care recommendations, discharge planning |
| Hospital Administrator | Hospital KPI dashboard, readmission analytics, department performance, exports |
| Healthcare Researcher | Anonymised cohort browser, population health charts, dataset export |
| System Administrator | User management, model registry, audit log viewer |

## Rules

- A wireframe must show the empty state and the error state, not just the happy path.
- Never use a real patient's data in a mockup. Invent obviously synthetic names.
- Commit exports as PNG or SVG. Link them from
  [`docs/06-milestones/milestone-1.md`](../06-milestones/milestone-1.md).
- Keep files under 1 MB. CI warns above that and blocks above 5 MB.

---

## Project documentation (HealthForecast AI)

The final interface is documented with screenshots of the running system. All data
is synthetic. Images are in [`../06-milestones/evidence/`](../06-milestones/evidence/).

| Role | Screens | Screenshot |
|---|---|---|
| Doctor | Assigned patients, risk prediction, care recommendations, discharge plan | `role_based.png`, `risk.png`, `support.png` |
| Hospital Administrator | KPI dashboard, analytics, reports and exports | `analytics.png`, `reports.png` |
| Researcher | Anonymised cohort, population health | `researcher.png` |
| System Administrator | User management, model registry | `user.png`, `models.png` |

### Empty and error states

| State | Screenshot |
|---|---|
| Empty high-risk list | `[empty-high-risk.png]` |
| Failed login or API error | `[error-state.png]` |

Take these two screenshots, then replace the bracketed names. Keep every file under 1 MB.