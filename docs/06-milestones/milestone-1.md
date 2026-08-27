# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

> **How to use this file**
> 1. Fill in every section below. Keep all five headings, even if an answer is short.
> 2. Delete the `_Not started_` line once you begin - that line is what tells CI
>    the report is still a blank template.
> 3. Commit it on your own branch. Do not open a pull request to `main`.

- **Intern name:** Rachana
- **Branch:** `intern/rachana`
- **Submitted on:** 2026-08-27

---

## Scope for this milestone

- Define healthcare workflows and project objectives.
- Design system architecture and database schema.
- Create UI wireframes and workflow planning.
- Setup frontend and backend environments.
- Implement authentication, role-based access control, user permissions, and dashboard access management for Doctors, Hospital Administrators, Healthcare Researchers, and System Administrators.
- Load Diabetes 130-US Hospitals Dataset.
- Build patient management and healthcare dashboard workflows.

## Evaluation criteria

- Project initialization and architecture setup completed.
- Authentication, role-based access control and patient management workflows implemented.
- Healthcare dashboard functional.
- Dataset integration and preprocessing completed.

---

## What I built

- Implemented raw dataset ingestion pipeline (`ml/src/data/load_data.py`) to process 99,493 medical records and binarise the 30-day readmission target.
- Developed relational SQL seed generation script (`database/postgres/seeds/seed_data.py`) to convert processed ML outputs into `patients` and `admissions` table structures.
- Generated relational SQL seeds (`database/postgres/seeds/01_seed_data.sql`) containing patient demographics and hospital admission records.

## How to run it

```bash
# Switch to feature branch
git checkout intern/rachana

# Install required dependencies
pip install pandas black ruff

# Process dataset and build PostgreSQL database seed file
python database/postgres/seeds/seed_data.py