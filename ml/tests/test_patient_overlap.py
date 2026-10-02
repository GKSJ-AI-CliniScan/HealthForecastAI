"""Zero-patient-overlap check on the REAL train/val/test split.

Rebuilds the split exactly as train.py does (scripts.lineage_common) and
asserts no patient_nbr appears in two splits. Skipped where the raw dataset
is absent (it is never committed - e.g. in CI); the unit-level behaviour of
patient_overlap() is covered in test_lineage_metrics.py.
"""

import pytest

from src.models.train import resolve_path
from src.utils.config import load_config

RAW_PATH = resolve_path(load_config()["dataset"]["raw_path"])


@pytest.mark.skipif(not RAW_PATH.exists(), reason="raw dataset not downloaded (ml/data/README.md)")
def test_no_patient_is_in_two_splits() -> None:
    from scripts.drift_and_leakage_report import overlap_counts
    from scripts.lineage_common import rebuild_splits

    data = rebuild_splits()
    counts = overlap_counts(data)
    assert counts["train_test"] == 0
    assert counts["train_val"] == 0
    assert counts["val_test"] == 0
    # The reason the split is patient-disjoint: one encounter per patient.
    assert counts["duplicate_patients_in_dataset"] == 0
    # Sizes match the split metrics.json was computed on.
    assert (len(data.x_train), len(data.x_val), len(data.x_test)) == (48990, 6999, 13998)
