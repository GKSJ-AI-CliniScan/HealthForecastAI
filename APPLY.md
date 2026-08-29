# Milestone 2 — chunk 1 (v2)

Supersedes milestone2-chunk1.zip. Extract at the repo root of
intern/kanak-prabhakar; the folders mirror the repo layout.

## Verify

    cd ~/Downloads/HealthForecastAI
    source backend/.venv/bin/activate

    pip install -r backend/requirements.txt      # picks up xgboost 2.1.4

    cd backend && python -m pytest tests -q      # expect 70 passed
    python -m ruff check app tests
    python -m black --check --line-length 100 app tests

    cd ../ml && python -m pytest tests -q        # expect 27 passed
    python -c "import src.models.train"          # imports, not just syntax
    python -m src.models.train                   # the real run

## What changed since v1

Three bugs that only surface when the pipeline actually runs. The CI
syntax check parses files without importing or executing them, so none
of these would have been caught before a real training run.

1. ml/src/models/train.py — resolve_path()
   Config paths are written relative to the repo root. build_dataset.py
   already resolved them against REPO_ROOT; train.py passed them straight
   to load_raw, so it only worked when invoked from the repo root. This
   was the FileNotFoundError.

2. ml/src/models/train.py — IDENTIFIER_COLUMNS
   basic_clean deliberately keeps patient_nbr because the database
   seeding needs it. train.py dropped only the target, so patient_nbr
   reached the model as a numeric feature it could memorise. Identifiers
   are now dropped explicitly and the run prints what it removed.

3. ml/src/data/preprocess.py — fill_missing_as_category
   ICD-9 codes mix numeric values (250.83) with alphanumeric ones (V57),
   so pandas holds diag_1/2/3 as object columns containing both floats
   and strings. OneHotEncoder rejects that:
     TypeError: Encoders require their input argument must be uniformly
     strings or numbers. Got ['float', 'str']
   The filled columns are now cast to str.

## Dependency change — affects the whole team

xgboost 2.1.3 -> 2.1.4 in both requirements.txt files.

scikit-learn 1.6.0 (already pinned) removed an internal hook that
xgboost 2.1.3 relied on, so any XGBoost pipeline fails at predict time
with:
  AttributeError: 'super' object has no attribute '__sklearn_tags__'

2.1.4 is a patch release that fixes exactly this. Verified working with
scikit-learn 1.6.0. Downgrading scikit-learn instead was rejected because
the backend shares that pin.
