> **Pull requests into `main` are not accepted on this project.**
>
> Your work is reviewed on your own branch. Push to `intern/<your-name>` and
> send your mentor the branch link. The Branch guard workflow will fail this
> pull request if it targets `main`.
>
> If you are opening this against another branch on purpose, carry on.

## What this changes

<!-- One or two sentences. -->

## Milestone

- [ ] Milestone 1 - Project initialization, design and core setup
- [ ] Milestone 2 - Risk prediction and readmission forecasting
- [ ] Milestone 3 - Treatment effectiveness and healthcare analytics
- [ ] Milestone 4 - Testing, deployment and documentation

## Checks

- [ ] `ruff check .` and `black --check .` pass in `backend/` and `ml/`
- [ ] `pytest` passes in `backend/` and `ml/`
- [ ] `npm run lint`, `npm run build` and `npm run typecheck` pass in `frontend/`
- [ ] Every new endpoint declares a permission with `require_permission(...)`
- [ ] No dataset, model artifact, `.env` file or credential is committed
- [ ] No real patient data anywhere, including screenshots
- [ ] Milestone report updated in `docs/06-milestones/`

## Evidence

<!-- Screenshots, API responses or terminal output. -->
