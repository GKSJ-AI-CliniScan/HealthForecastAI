# HealthForecast AI - Machine Learning

Readmission risk modelling: data loading, preprocessing, feature engineering,
training, evaluation and inference.

## Layout

| Path                          | Responsibility |
|-------------------------------|----------------|
| `configs/config.yaml`         | Single source of truth for every experiment - both dataset profiles |
| `src/data/load_data.py`       | Raw CSV loading and target binarisation (risk + readmission) |
| `src/data/validate.py`        | Row-level schema/plausibility validation |
| `src/data/preprocess.py`      | Leakage-safe cleaning, dedup, column selection |
| `src/features/build_features.py` | Feature engineering + the `ColumnTransformer` pickled with the model |
| `src/models/train.py`         | Training entrypoint, split, model selection, imbalance handling |
| `src/models/artifacts.py`     | Write-once versioned runs and promotion of the shared artefacts |
| `src/models/predict.py`       | Batch and single-record inference |
| `src/evaluation/metrics.py`   | Accuracy, precision, recall, F1, ROC-AUC, risk banding |
| `notebooks/`                  | Exploration only - strip outputs before committing |
| `data/`                       | Never committed. See `data/README.md` |
| `artifacts/`                  | Never committed. Trained models and metrics |

## Run

```bash
cd ml
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

# 1. download the dataset (see data/README.md - India Hospital Readmission is
#    primary; Diabetes 130-US is a working fallback if you don't have it yet)
# 2. train both the risk model and the 30-day readmission model
python -m src.models.train --config configs/config.yaml

# train just one flow, or against the fallback dataset:
python -m src.models.train --target risk
python -m src.models.train --dataset diabetes_130_us
```

Each metrics file is shaped for direct mapping onto a `model_metadata` row
(`docs/niyati/HealthForecastAI_Milestone2_Design.md` section 3.1):
`metrics.{accuracy,precision,recall,f1,roc_auc}`, `best_model`, `trained_at`.

## Model artefacts

Training writes into `artifacts/` (or `--output-dir DIR`, which uses the same
layout - use it for experiments). Implemented in `src/models/artifacts.py`.

```
artifacts/
  runs/<target>/<version>/model.joblib    # every run, candidate or promoted
  runs/<target>/<version>/metrics.json    # its metrics + artifact.sha256
  <target>_model.joblib                   # copy of the latest PROMOTED run
  <target>_metrics.json                   # its metrics (names the run directory)
```

`<target>` is `risk` or `readmission`; `<version>` is the run's `trained_at`
as `YYYYMMDDTHHMMSSffffffZ` (UTC).

- **Every run is a candidate.** It is saved complete and write-once in its own
  `runs/` directory: built under `<version>.partial`, flushed to disk, then
  renamed into place. An existing run directory is never overwritten.
- **Promotion.** Only a run that meets every threshold in
  `evaluation.thresholds` (`configs/config.yaml`) replaces the shared
  `<target>_*` files. Each file is swapped in whole (`os.replace`); the
  metrics file goes first.
- **One promotion at a time.** Promotion holds `artifacts/.promote.lock`,
  created atomically (`O_CREAT|O_EXCL`) and removed when promotion ends, also
  on errors. If the file already exists, training stops with
  `PromotionLockedError` naming the recorded holder (pid, host, start time);
  the new run is kept in `runs/` but not promoted. The lock is never removed
  automatically: a process killed outright, or a power loss, leaves it behind.
  Delete it by hand only after confirming no training process is running,
  then train again.
- **When training fails** - a model misses the thresholds, an exception is
  raised, or saving is interrupted - the shared `<target>_*` files keep their
  previous bytes. A run that missed the thresholds stays in `runs/` for review
  and the command exits non-zero. A failed save removes its own `.partial`
  directory; a hard crash (power loss) can leave one behind, which is never
  registered and can be deleted by hand.
- If a promotion is interrupted between the two swaps, the shared metrics
  already name the new run while `<target>_model.joblib` is still the previous
  model. Registration is unaffected (it reads the run directory); anything else
  using the shared pair should compare the model's sha256 with
  `artifact.sha256` in the metrics.
- **Durability depends on the OS.** File contents are fsynced before they are
  published, everywhere. The renames that publish them are made durable with a
  directory fsync on POSIX (Linux, macOS) where the filesystem supports it.
  Windows offers no directory fsync in the standard library: NTFS makes each
  rename all-or-nothing after a crash, but a very recent rename can be lost on
  power failure, so a just-published run or promotion may need repeating.

## Registering a model

`scripts/register_model.py` (run from the repository root, with the backend
database migrated) writes a `model_metadata` row. The backend serves the
`production` row of each model family.

```powershell
# the latest promoted run (the shared artifacts/<target>_metrics.json)
backend\.venv\Scripts\python scripts\register_model.py readmission
backend\.venv\Scripts\python scripts\register_model.py risk

# a specific saved run, by its directory name under artifacts/runs/<target>/
backend\.venv\Scripts\python scripts\register_model.py readmission --run 20261010T123456789012Z

# a run that missed the promotion thresholds, deliberately, as experimental
backend\.venv\Scripts\python scripts\register_model.py readmission --run 20261010T123456789012Z --allow-unpromoted
```

`--artifacts-dir DIR` reads from a directory other than `ml/artifacts`.

- **Unpromoted runs are refused** unless `--allow-unpromoted` is given. With
  it, the run is registered as `staged`: it is not served, and the current
  `production` version is left as it is. A promoted run is registered as
  `production` and the previous `production` version becomes `retired`.
- **Checks that always run**, with or without the override: provenance (source
  files and training rows recorded), target (a `readmission` run cannot be
  registered as `risk`), version binding (the metrics must name this
  version's own `runs/<target>/<version>/` and agree with that run's own
  `metrics.json`), sha256 integrity of the model file, and compatibility
  (`predict_proba`, classes `[0, 1]`, features supplied by the backend
  `FeatureBuilder`). A version can be registered once.
- **Versions are immutable.** The registry stores the absolute path of the
  run's own `model.joblib`, never the shared `<target>_model.joblib`, so a
  later promotion does not change what an earlier version serves. Paths are
  absolute, so register again after moving the repository to another machine.
- **Artefacts from before versioned runs** (shared files whose metrics have
  no `artifact` block, such as the models trained on 2026-10-09) record no
  hash, so nothing in them proves the shared model belongs to its metrics.
  They are adopted only with `--expect-sha256 <64 hex digits>`: the model's
  hash recorded independently, for example when the files were backed up -
  never one computed from the file at registration time. The shared model
  must match it before it is copied, write-once, into
  `runs/<target>/<version>/`, and the copy must match it afterwards; the
  shared files are not modified.

  ```powershell
  backend\.venv\Scripts\python scripts\register_model.py readmission --expect-sha256 <recorded sha256 of readmission_model.joblib>
  ```

## Serving: integrity check

`backend/app/services/ml/model_loader.py` loads the `production` row's file.
For a versioned file (`runs/<target>/<version>/model.joblib`) it first
compares the file's sha256 with `artifact.sha256` in the run's
`metrics.json`; if the file or that record is missing, unreadable or
different, the model is not loaded and the API answers "model not available"
(the same response as when nothing is registered), and the reason is logged.
The check runs once per backend process, before the file is first loaded.

Rows registered before versioned runs point at a shared
`<target>_model.joblib` with no recorded hash. They are still served, for
compatibility, with a warning in the log. Register the model again with the
current script (using `--expect-sha256`) to move it to a verified path.

## Checks that CI runs

```bash
ruff check .
black --check .
pytest
```

## Rules

- Change hyperparameters in `configs/config.yaml`, never inline in a script.
- Report all five metrics. The target is imbalanced (roughly 11% positives), so
  accuracy on its own hides a model that predicts "no readmission" every time.
- A false negative - a high-risk patient discharged without follow-up - is the
  expensive error here. Watch recall, not just ROC-AUC.
- `tests/test_metrics.py` pins the risk bands to the backend. If you change a
  threshold, change it in `configs/config.yaml`, `backend/app/core/config.py`
  and `.env.example` together.
