# Intern guide - HealthForecast AI

Everything you need to work on this project. Read it once end to end before you
write any code, then come back to it when CI complains.

**Project:** Predictive Healthcare Intelligence System for Patient Readmission
and Resource Optimization
**Duration:** 8 weeks, 4 milestones
**Interns:** 26, each on their own branch

---

## Table of contents

1. [The one rule that shapes everything](#1-the-one-rule-that-shapes-everything)
2. [Get set up](#2-get-set-up)
3. [Create your branch](#3-create-your-branch)
4. [What the repository contains](#4-what-the-repository-contains)
5. [Your daily loop](#5-your-daily-loop)
6. [What CI checks](#6-what-ci-checks)
7. [Run the checks locally](#7-run-the-checks-locally)
8. [Commit and branch conventions](#8-commit-and-branch-conventions)
9. [Milestones and submission](#9-milestones-and-submission)
10. [Hard rules](#10-hard-rules)
11. [When CI fails](#11-when-ci-fails)
12. [Getting help](#12-getting-help)
13. [Branch roster](#13-branch-roster)

---

## 1. The one rule that shapes everything

**You work on your own branch, and nothing is merged into `main`.**

All 26 of you build the same platform independently. Your branch is your
submission. There is no shared integration branch, no merge queue, and no pull
request into `main` - the Branch guard workflow will fail one if you open it.

What that means in practice:

- `main` is a read-only starting point. Take from it, never push to it.
- You never need to rebase onto someone else's work.
- You will never hit a merge conflict with another intern.
- Your branch must stand on its own. A reviewer clones it and runs it. If it only
  works on your laptop, it does not work.

---

## 2. Get set up

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Git | any recent | `git --version` |
| Python | 3.11 or 3.12 | `python --version` |
| Node.js | 20 or newer (22 recommended) | `node --version` |
| Docker Desktop | any recent | `docker --version` |

CI runs Python 3.11 and Node 22. If you use a much newer or older version
locally, something that passes for you can still fail in CI.

### Clone

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
```

### Environment file

```bash
cp .env.example .env
```

Then open `.env` and set a real `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`.env` is gitignored. It must stay that way - see [Hard rules](#10-hard-rules).

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Check <http://localhost:8000/docs>.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Check <http://localhost:3000>.

### ML

```bash
cd ml
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Download the dataset following [`ml/data/README.md`](ml/data/README.md).

### Everything at once, with databases

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | <http://localhost:3000> |
| Backend | <http://localhost:8000> |
| API docs | <http://localhost:8000/docs> |
| PostgreSQL | `localhost:5432` |
| MongoDB | `localhost:27017` |

---

## 3. Create your branch

Find your branch name in the [roster](#13-branch-roster) at the end of this guide
and use it **exactly**. CI rejects any branch it does not recognise, and a
rejected branch means your work is not attributed to you.

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI

# Replace with YOUR row from the roster.
git checkout -b intern/01-mamidi-srija-reddy origin/main
git push -u origin intern/01-mamidi-srija-reddy
```

Branching from `origin/main` matters: the CI workflows live on `main`, and GitHub
only runs the workflows that exist on the branch you push. Branch from anywhere
else and you get no pipeline at all.

Confirm it worked: open the **Actions** tab. You should see a CI run against your
branch with a **Branch policy** step that names you.

### Naming rules

```
intern/NN-firstname-lastname
```

- The number is your roster ID, zero-padded: `01`, not `1`.
- Lower case only, words separated by hyphens.
- No spaces, no underscores, no capitals, no dots.

The roster in [`.github/interns.yml`](.github/interns.yml) is the single source of
truth. CI reads that file — it does not match a pattern, it matches your name, so
`intern/john` and a misspelling both get rejected with a suggestion of what you
probably meant.

### Named it wrong already?

```bash
git branch -m intern/NN-your-roster-name
git push origin -u intern/NN-your-roster-name
git push origin --delete intern/your-old-name
```

If your name is spelled wrong in the roster, or you are not listed, open an issue.
Do not invent a branch name.

---

## 4. What the repository contains

```
HealthForecastAI/
├── .github/
│   ├── workflows/            CI, branch guard, security, progress report
│   └── ISSUE_TEMPLATE/       Ask for help with structure
├── backend/                  FastAPI service
│   ├── app/
│   │   ├── core/             Config, security, RBAC, logging
│   │   ├── api/v1/endpoints/ One file per module from the brief
│   │   ├── models/           SQLAlchemy ORM
│   │   ├── schemas/          Pydantic request/response
│   │   ├── services/         Business logic
│   │   └── repositories/     Database access
│   ├── alembic/              Migrations
│   └── tests/                Pytest suite
├── frontend/                 Next.js + Tailwind dashboards
│   └── src/{app,components,lib,hooks,types}
├── ml/                       Modelling pipeline
│   ├── configs/config.yaml   Every hyperparameter lives here
│   ├── src/{data,features,models,evaluation,utils}
│   ├── notebooks/            Exploration only
│   ├── data/                 Never committed
│   ├── artifacts/            Never committed
│   └── tests/
├── database/
│   ├── postgres/{schema,migrations,seeds}
│   └── mongodb/{schemas,seeds}
├── deployment/               Docker, nginx, AWS, Azure
├── docs/
│   ├── 01-architecture/  02-database/  03-api/  04-rbac/
│   ├── 05-wireframes/    06-milestones/  ← your reports
│   ├── 07-testing/       08-deployment/
│   └── brief/            The original PDF specification
├── scripts/ci/               The check scripts CI runs
├── tests/                    Integration and end-to-end tests
├── docker-compose.yml
├── .env.example
└── INTERN_GUIDE.md           This file
```

The scaffold is deliberately incomplete. Endpoints return `501` or empty lists
and are marked `TODO(milestone-N)`. Filling those in is the work.

Find yours:

```bash
grep -rn "TODO(milestone-1)" backend/ ml/ frontend/
```

### The seven modules

| # | Module | Milestone |
|---|--------|-----------|
| 1 | User Management - accounts, auth, roles | 1 |
| 2 | Patient Data Management - records, history, admissions | 1 |
| 3 | Risk Prediction - risk scores, readmission probability | 2 |
| 4 | Treatment Effectiveness - outcomes, recovery, medication | 3 |
| 5 | Clinical Decision Support - recommendations, discharge | 3 |
| 6 | Healthcare Analytics Dashboard - reports, trends | 3 |
| 7 | AI Model Management - training, evaluation, monitoring | 4 |

### The four roles

Doctor, Hospital Administrator, Healthcare Researcher, System Administrator.
The full access matrix is in [`docs/04-rbac/README.md`](docs/04-rbac/README.md)
and is enforced by `backend/app/core/rbac.py`.

---

## 5. Your daily loop

```bash
# 1. Make sure you are on your branch
git branch --show-current

# 2. Work

# 3. Run the checks locally  (section 7)

# 4. Commit and push
git add .
git commit -m "feat(risk): add readmission probability endpoint"
git push origin intern/firstname-lastname

# 5. Open the Actions tab and confirm your run is green
```

Push at least once a day, even for unfinished work. A branch that only gets
pushed the night before a milestone is a branch nobody can help you with.

---

## 6. What CI checks

Every push to any branch triggers **CI**. Jobs skip themselves when the relevant
folder does not exist yet, so a week-1 branch is not failed for a missing
frontend.

| Job | What it does |
|-----|--------------|
| **Detect project areas** | Works out which parts of the project exist on your branch |
| **Repository checks** | Branch name, folder structure, **every file you pushed parsed by type**, committed files, secrets, notebooks, doc links, milestone reports |
| **Backend (FastAPI)** | `ruff check`, `black --check`, `mypy` (advisory), `pytest` with coverage |
| **Frontend (Next.js)** | `npm ci`, `npm run lint`, `npm run build`, `npm run typecheck`, `npm test` |
| **ML pipeline** | `ruff check`, `black --check`, `pytest` |
| **Docker build** | Builds both images and validates `docker-compose.yml`. Only runs when a `Dockerfile`, a requirements file, `package.json` or `docker-compose.yml` changed |
| **CI summary** | One table with the verdict for every job |

A job showing `skipped` is not a failure. It means that part of the project does
not exist on your branch yet, or nothing relevant to it changed in this push.

Two more workflows run alongside it:

| Workflow | When | What |
|----------|------|------|
| **Branch guard** | On any pull request | Fails a pull request that targets `main`; warns when shared CI files are changed |
| **Security** | Every push and weekly | `pip-audit`, `npm audit`, CodeQL. Reports, does not block |
| **Cohort report** | Weekly, and on demand | Mentor-facing: every intern in the roster, their branch, commits ahead of main, CI result and last push |
| **Deploy** | Manual only | Milestone 4. Verifies your branch, builds the images, and releases to your environment |

### Deploying (Milestone 4)

Nothing deploys automatically - 26 branches pushing to one environment would
fight each other. When you are ready, run it yourself:

1. Open the **Actions** tab and select **Deploy**.
2. Click **Run workflow** and pick your own branch.
3. Leave **push_images** off for a dry run that only proves your branch builds.
   Turn it on to publish the images to the GitHub Container Registry.

The cloud release step is deliberately a placeholder - implementing it is the
Milestone 4 task. Follow [`deployment/aws/`](deployment/aws/) or
[`deployment/azure/`](deployment/azure/), and put your cloud credentials in
repository secrets, never in a file.

### The repository checks in detail

| Check | Fails when |
|-------|-----------|
| Branch naming | Your branch does not match `intern/<your-name>` |
| Folder structure | A required directory or file was renamed or deleted, or a `.env` file was committed |
| File syntax validation | Any file you pushed does not parse: Python, JSON, YAML, TOML, INI, SQL, shell, nginx config, notebook, or a markdown page with an unclosed code fence |
| Committed file policy | A file is over 5 MB, or you committed a dataset, model artifact, key file or database file, or a filename suggests real patient data |
| Secret scan | An API key, token, private key, or a database URL with a password appears in a tracked file |
| Notebook hygiene | A committed `.ipynb` still contains saved cell outputs |
| Documentation links | A relative markdown link points at a file that does not exist |
| Milestone reports | A report you filled in is missing one of its five required headings |

---

## 7. Run the checks locally

CI runs exactly these commands. Run them before every push and you will almost
never see a red build.

**Backend**

```bash
cd backend
ruff check .
black --check .
pytest --cov=app --cov-report=term-missing
```

**Frontend**

```bash
cd frontend
npm run lint
npm run build
npm run typecheck
```

**ML**

```bash
cd ml
ruff check .
black --check .
pytest
```

**Repository checks**

```bash
python scripts/ci/check_structure.py
python scripts/ci/check_syntax.py
python scripts/ci/check_files.py
python scripts/ci/check_secrets.py
python scripts/ci/check_notebooks.py
python scripts/ci/check_docs.py
python scripts/ci/check_milestones.py
python scripts/ci/check_branch.py "$(git branch --show-current)"
```

**Docker**

```bash
docker compose config --quiet
docker build -t healthforecast-backend ./backend
docker build -t healthforecast-frontend ./frontend
```

### Auto-fixing

`ruff` and `black` fix most of what they find:

```bash
cd backend && ruff check . --fix && black .
cd ../ml && ruff check . --fix && black .
cd ../frontend && npm run lint:fix
```

---

## 8. Commit and branch conventions

### Commit messages

```
<type>(<scope>): <what changed, in the imperative>
```

| Type | Use for |
|------|---------|
| `feat` | A new capability |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `test` | Tests only |
| `refactor` | Restructuring with no behaviour change |
| `chore` | Dependencies, config, tooling |
| `ci` | Workflow changes |

Good:

```
feat(risk): add readmission probability endpoint
fix(auth): reject expired tokens instead of returning 500
docs(milestone-2): add model comparison results
test(rbac): cover researcher access to anonymised patients
```

Not good: `update`, `fix bug`, `final version`, `asdf`, `changes`.

### Commit size

One logical change per commit. If the message needs the word "and", it is
probably two commits.

---

## 9. Milestones and submission

| Milestone | Weeks | Theme | Report |
|-----------|-------|-------|--------|
| 1 | 1-2 | Project initialization, design and core setup | [milestone-1.md](docs/06-milestones/milestone-1.md) |
| 2 | 3-4 | Risk prediction and readmission forecasting | [milestone-2.md](docs/06-milestones/milestone-2.md) |
| 3 | 5-6 | Treatment effectiveness and healthcare analytics | [milestone-3.md](docs/06-milestones/milestone-3.md) |
| 4 | 7-8 | Testing, deployment and documentation | [milestone-4.md](docs/06-milestones/milestone-4.md) |

### How to submit

1. Push all your work to your branch.
2. Fill in the milestone report in `docs/06-milestones/`. Delete the
   `_Not started_` line and keep all five headings: **What I built**,
   **How to run it**, **Evidence**, **Metrics**, **Known gaps**.
3. Confirm your CI run is green in the Actions tab.
4. Send your mentor the branch link.

**Do not open a pull request.** It will be failed by the Branch guard.

### What gets graded

- Does the branch run from a clean clone, following your own instructions?
- Is CI green?
- Are the milestone's evaluation criteria met? They are listed at the top of
  each report template, taken from the brief.
- Is the code readable, tested, and does it enforce the access matrix?
- Is the report honest? A clear "Known gaps" section scores better than a
  vague claim that everything works.

### Metrics to report

For milestone 2 onward, report all five model metrics: **accuracy, precision,
recall, F1, ROC-AUC**. Roughly 11% of encounters in the dataset are 30-day
readmissions, so a model that always predicts "no readmission" scores about 89%
accuracy and is useless. Accuracy on its own is not an answer.

---

## 10. Hard rules

Breaking one of these fails CI, and in most cases fails your submission.

### Never commit

| Thing | Why | What to do instead |
|-------|-----|--------------------|
| `.env` files | They hold your secret key and database password | `.env.example` with placeholder values |
| API keys, tokens, private keys | Anyone who clones the repo now has them | Read them from the environment |
| Datasets (`.csv`, `.parquet`, `.xlsx`) | Bloats the repo and can leak patient rows | Document the download in `ml/data/README.md` |
| Model artifacts (`.pkl`, `.joblib`, `.h5`) | Binary files git cannot diff | Keep in `ml/artifacts/`, report metrics in your milestone report |
| Notebook outputs | Unreadable diffs, can embed data rows | `nbstripout ml/notebooks/*.ipynb` |
| Files over 5 MB | Slows the clone for everyone | Link to storage |
| **Real patient data, anywhere** | It is health data | Synthetic fixtures only, including in screenshots |

If you commit a credential by accident, **removing the line is not enough** - it
stays in git history. Rotate the credential immediately, then tell your mentor.

### Security rules

- Every endpoint declares a permission with `require_permission(...)`.
  An endpoint without an authorisation dependency will fail review.
- Authorise on the server. Hiding a button in the frontend is not security.
- Only `NEXT_PUBLIC_`-prefixed variables reach the browser. Never put a secret
  behind that prefix.
- Never log or return a patient identifier in an error message.
- `backend/tests/test_rbac.py` encodes the access matrix from the brief. If your
  change makes it fail, fix your change - do not edit the test.

### Do not

- Push to `main` or open a pull request into it.
- Push to another intern's branch.
- Delete or rename a top-level directory.
- Weaken a CI check, lower a threshold, or delete an assertion to get a green
  build. If a check is wrong, open a
  [CI issue](https://github.com/GKSJ-AI-CliniScan/HealthForecastAI/issues/new?template=ci-failure.yml) and say so.

---

## 11. When CI fails

1. Open the **Actions** tab and click your run.
2. Read the **summary at the top of the run** before the logs. Every repository
   check writes a plain-English explanation and a suggested fix there.
3. Reproduce it locally with the matching command from
   [section 7](#7-run-the-checks-locally).
4. Fix, commit, push.

### Common failures

**`Branch name '...' does not follow the required pattern`**
Rename it: `git branch -m intern/your-name`, then push the new name.

**`Format check (black)` failed**
Run `black .` in `backend/` or `ml/` and commit the result.

**`Lint (ruff)` failed**
Run `ruff check . --fix`. What remains needs a real fix - read the rule code it
prints.

**`Dataset file committed`**
```bash
git rm --cached ml/data/raw/diabetic_data.csv
git commit -m "chore: stop tracking the dataset"
```

**`Possible ... key committed`**
Rotate the credential first. Then remove it from the file and read it from the
environment. Tell your mentor, because it is still in history.

**`Notebook still contains saved output`**
```bash
pip install nbstripout
nbstripout ml/notebooks/*.ipynb
git add ml/notebooks && git commit -m "chore: strip notebook outputs"
```

**`Required file is missing`**
You deleted or renamed something shared. Restore it:
```bash
git checkout origin/main -- <path>
```

**`Frontend build` fails in CI but works locally**
Your `package-lock.json` is stale or uncommitted. Run `npm install` and commit
the lockfile.

**Pull request failed with "Pull requests into main are not accepted"**
Working as intended. Close it and push to your own branch.

---

## 12. Getting help

1. Read the failing job summary.
2. Read the README in the folder you are working in - each one lists its rules.
3. Re-read the [project brief](docs/brief/README.md).
4. Open an issue:
   - [I am blocked](https://github.com/GKSJ-AI-CliniScan/HealthForecastAI/issues/new?template=blocked.yml)
   - [CI check I do not understand](https://github.com/GKSJ-AI-CliniScan/HealthForecastAI/issues/new?template=ci-failure.yml)
5. Message your mentor with the branch link and the failing run link.

Ask on day two of being stuck, not day seven. Everyone here is building the same
thing, so your question is probably not unique.

### Reference

| Topic | Where |
|-------|-------|
| Project brief | [`docs/brief/`](docs/brief/) |
| Architecture | [`docs/01-architecture/`](docs/01-architecture/) |
| Database design | [`docs/02-database/`](docs/02-database/) |
| API reference | [`docs/03-api/`](docs/03-api/) |
| RBAC access matrix | [`docs/04-rbac/`](docs/04-rbac/) |
| Wireframes | [`docs/05-wireframes/`](docs/05-wireframes/) |
| Milestone reports | [`docs/06-milestones/`](docs/06-milestones/) |
| Testing | [`docs/07-testing/`](docs/07-testing/) |
| Deployment | [`docs/08-deployment/`](docs/08-deployment/) |
| Dataset download | [`ml/data/README.md`](ml/data/README.md) |

---

## 13. Branch roster

Use your row exactly. Branch names are lower case and the number is zero-padded.
This table mirrors [`.github/interns.yml`](.github/interns.yml), which is what CI
actually reads.

| # | Intern | Branch |
|---|---|---|
| 01 | Mamidi Srija Reddy | `intern/01-mamidi-srija-reddy` |
| 02 | Padarthi Dhana Lakshmi | `intern/02-padarthi-dhana-lakshmi` |
| 03 | Kanchan Anamika Maheshwari | `intern/03-kanchan-anamika-maheshwari` |
| 04 | Nandini Varshney | `intern/04-nandini-varshney` |
| 05 | Suravarapu Durga Prasad | `intern/05-suravarapu-durga-prasad` |
| 06 | G Chandrasekhar Reddy | `intern/06-g-chandrasekhar-reddy` |
| 07 | Mujahad Ahmed | `intern/07-mujahad-ahmed` |
| 08 | Vaishnavi Agrahari | `intern/08-vaishnavi-agrahari` |
| 09 | Pasam Sai Divyasri | `intern/09-pasam-sai-divyasri` |
| 10 | Saumya S | `intern/10-saumya-s` |
| 11 | Kanak Prabhakar | `intern/11-kanak-prabhakar` |
| 12 | Chilukuri Venugopal | `intern/12-chilukuri-venugopal` |
| 13 | Rambilas Sah | `intern/13-rambilas-sah` |
| 14 | Samarth A C | `intern/14-samarth-a-c` |
| 15 | Sattu Penchala Prasad | `intern/15-sattu-penchala-prasad` |
| 16 | Deepak Rajak | `intern/16-deepak-rajak` |
| 17 | Komakula Mahesh | `intern/17-komakula-mahesh` |
| 18 | Raniya Raseen M M | `intern/18-raniya-raseen-m-m` |
| 19 | Niyati R | `intern/19-niyati-r` |
| 20 | Kiruthika B | `intern/20-kiruthika-b` |
| 21 | Rachana M N | `intern/21-rachana-m-n` |
| 22 | Liya Babu | `intern/22-liya-babu` |
| 23 | Nishakar T | `intern/23-nishakar-t` |
| 24 | Parimala M | `intern/24-parimala-m` |
| 25 | V Naga Phanendra | `intern/25-v-naga-phanendra` |
| 26 | Kaaluru Manjunath | `intern/26-kaaluru-manjunath` |

If your name is spelled wrong, or you are not listed, open an issue — do not
invent a branch name.

### Your branch was renamed on 5 September 2026

Branches were originally free-form (`intern/your-name`). They now carry a roster
number so every branch maps to exactly one person. **Your work was not touched** —
the branch was renamed, and the commits are identical.

Your local clone still points at the old name. Fix it once:

```bash
git fetch origin --prune
git branch -m intern/NN-your-roster-name
git branch --set-upstream-to=origin/intern/NN-your-roster-name
```

Then carry on as normal. If `git push` complains about a missing upstream, run the
last line again with your exact roster name.
