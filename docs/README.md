# HealthForecast AI

Hospital readmission risk prediction and role-based patient management.
Intern: Parimala M &middot; Branch: `intern/24-parimala-m`

## Live

- Frontend: <https://healthforecastai-1.onrender.com>
- API docs: <https://healthforecastai-sarj.onrender.com/docs>

The free tier sleeps when idle; the first request can take about a minute.

## What it does

- Predicts 30-day readmission risk for diabetic patients and bands it low, medium or high.
- Lists high-risk patients and forecasts readmissions over 30, 60 or 90 days.
- Reports treatment effectiveness, healthcare analytics and an anonymised research cohort.
- Gives clinical recommendations and discharge plans.
- Four roles with different access: doctor, hospital administrator, researcher, system administrator.
- User and model management for system administrators.

## Stack

Next.js, TypeScript, Tailwind, Recharts | FastAPI, SQLAlchemy | PostgreSQL |
scikit-learn, XGBoost | Docker on Render | GitHub Actions

## Run locally

See "How to run it" in [`docs/06-milestones/milestone-4.md`](docs/06-milestones/milestone-4.md).

## Documentation

Start at [`docs/README.md`](docs/README.md). Milestone reports are in
[`docs/06-milestones`](docs/06-milestones/).

## Limitations

Research prototype on a public dataset. Not clinically validated. See Known gaps in
the milestone 4 report.