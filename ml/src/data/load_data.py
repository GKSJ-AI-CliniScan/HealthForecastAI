"""Dataset loading for the Diabetes 130-US Hospitals dataset.

The raw CSV is NOT committed to git. Download it into ml/data/raw/ first:
see ml/data/README.md.
"""

from __future__ import annotations

import io
from pathlib import Path

import pandas as pd

# The dataset encodes missing values as "?" and an unusable gender as
# "Unknown/Invalid". Both are treated as missing on load.
MISSING_TOKENS = ["?", "Unknown/Invalid", ""]


def load_raw(path: str | Path) -> pd.DataFrame:
    """Read the raw hospital admissions CSV.

    Missing values in this dataset are encoded as "?" rather than blanks.

    ``keep_default_na`` is disabled on purpose: the literal string "None" in
    ``max_glu_serum`` and ``A1Cresult`` means "the test was not performed",
    which is information, not a missing value.
    """
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Raw dataset not found at {csv_path}. See ml/data/README.md for the "
            "download instructions - datasets are never committed to git."
        )
    return pd.read_csv(
        csv_path,
        keep_default_na=False,
        na_values=MISSING_TOKENS,
        low_memory=False,
    )


def load_id_mappings(path: str | Path) -> dict[str, dict[int, str]]:
    """Read IDS_mapping.csv into one lookup table per identifier column.

    The file holds three stacked tables separated by a blank line, so it cannot
    be read with a single ``read_csv`` call. The returned dictionary is keyed by
    the identifier column name, for example ``admission_type_id``.
    """
    mapping_path = Path(path)
    if not mapping_path.exists():
        raise FileNotFoundError(
            f"ID mapping file not found at {mapping_path}. It ships with the "
            "dataset download - see ml/data/README.md."
        )

    raw_text = mapping_path.read_text(encoding="utf-8")
    blocks = [block.strip() for block in raw_text.split(",\n") if block.strip()]

    mappings: dict[str, dict[int, str]] = {}
    for block in blocks:
        table = pd.read_csv(io.StringIO(block))
        key = table.columns[0]
        mappings[key] = dict(zip(table[key], table["description"], strict=False))
    return mappings


def binarise_target(series: pd.Series, positive_label: str = "<30") -> pd.Series:
    """Convert the three-way readmitted column into a 30-day readmission flag.

    The brief targets readmission within 30 days, so ">30" and "NO" are both
    negative outcomes.
    """
    return (series.astype(str).str.strip() == positive_label).astype(int)
