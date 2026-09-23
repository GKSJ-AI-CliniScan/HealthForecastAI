# Datasets

**Nothing in `ml/data/` is committed to git.** `.gitignore` blocks every data file
in this tree. Committing a healthcare dataset - even a public one - to a shared
repository is treated as a submission failure, and CI will reject the push.

## India Hospital Readmission Dataset (2015-2024) - primary

The dataset named in the approved architecture
(`docs/niyati/HealthForecastAI_ML_Design.md` section 3.1); `configs/config.yaml`
sets `dataset.active: india_hospital_readmission`.

- Source: <https://www.kaggle.com/datasets/digutlaranjithkumar/india-hospital-readmission-dataset-20152024>
- Target column: `readmitted`

**Schema caveat:** no copy of this export has ever been available in this
repository or its CI - not for this pipeline, and not for the Postgres
importer it shares a column profile with
(`backend/app/services/dataset_import_service.py`). The column names and the
assumed `<30` / `>30` / `NO` readmitted vocabulary in `configs/config.yaml`
come from that importer's already-tested profile, not from a verified real
file. Whoever downloads the real export first should diff its columns against
`dataset.profiles.india_hospital_readmission` in `configs/config.yaml` and
update both this pipeline and the importer together if they differ, then
re-run `pytest` in both `ml/` and `backend/`.

### Download

Requires a Kaggle account and API token (`~/.kaggle/kaggle.json`):

```bash
mkdir -p ml/data/raw
kaggle datasets download -d digutlaranjithkumar/india-hospital-readmission-dataset-20152024 \
  -p ml/data/raw --unzip
```

Rename the resulting CSV to `ml/data/raw/india_hospital_readmission.csv` if
Kaggle's export uses a different filename - `configs/config.yaml`'s
`raw_path` expects that exact name.

## Diabetes 130-US Hospitals (1999-2008) - fallback / bootstrap

The dataset named in the project brief. Not the primary training source (see
above) - kept as a working, verified-schema profile for local development
when the India export is not available. Select it with
`python -m src.models.train --dataset diabetes_130_us`.

- Source: <https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008>
- Records: 101,766 encounters, 50 features
- Target column: `readmitted` with values `<30`, `>30`, `NO`

### Download

```bash
mkdir -p ml/data/raw
curl -L -o /tmp/diabetes.zip \
  "https://archive.ics.uci.edu/static/public/296/diabetes+130+us+hospitals+for+years+1999+2008.zip"
unzip -o /tmp/diabetes.zip -d ml/data/raw
```

You should end up with `ml/data/raw/diabetic_data.csv`.

## Directory contract

| Directory        | Contents |
|------------------|----------|
| `raw/`           | Untouched downloads. Never edited by hand. |
| `processed/`     | Output of the preprocessing pipeline. Regenerable, never committed. |
| `external/`      | Reference tables (ICD-9 mappings, admission-type codes). |

## Rules

1. Never commit a data file. Regenerate `processed/` from `raw/` with the pipeline.
2. Never put real, identifiable patient data in this repository at all.
3. Record any manual download step here so a teammate can reproduce your run.
