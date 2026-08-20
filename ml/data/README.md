# Datasets

**Nothing in `ml/data/` is committed to git.** `.gitignore` blocks every data file
in this tree. Committing a healthcare dataset - even a public one - to a shared
repository is treated as a submission failure, and CI will reject the push.

## Diabetes 130-US Hospitals (1999-2008)

The dataset named in the project brief.

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
