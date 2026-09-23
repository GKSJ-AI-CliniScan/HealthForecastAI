"""Row-level schema and plausibility validation shared by every dataset profile.

Mirrors the rules already implemented in
backend/app/services/dataset_import_service.py::DatasetImportService.validate_row,
applied here in vectorised form ahead of model training rather than one row at
a time ahead of a Postgres insert. Keeping the same rules in both places is
deliberate: a row good enough to import should also be good enough to train
on, and vice versa.
"""

from typing import Any

import pandas as pd

MIN_AGE = 0
MAX_AGE = 130


def validate_frame(
    frame: pd.DataFrame, profile: dict[str, Any]
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Return (valid_rows, rejection_reason_counts).

    A row is dropped, not repaired, when it fails a check - training on a
    guessed value is worse than training on fewer, trustworthy rows. A row
    already excluded by an earlier rule is not double-counted against a later
    one.
    """
    keep = pd.Series(True, index=frame.index)
    reasons: dict[str, int] = {}

    def reject(mask: pd.Series, reason: str) -> None:
        nonlocal keep
        newly_rejected = mask & keep
        count = int(newly_rejected.sum())
        if count:
            reasons[reason] = reasons.get(reason, 0) + count
        keep &= ~mask

    id_column = profile.get("id_column")
    if id_column and id_column in frame.columns:
        missing_id = frame[id_column].isna() | (frame[id_column].astype(str).str.strip() == "")
        reject(missing_id, "missing_patient_identifier")

    if "age" in frame.columns:
        age = pd.to_numeric(frame["age"], errors="coerce")
        implausible_age = age.notna() & ((age < MIN_AGE) | (age > MAX_AGE))
        reject(implausible_age, "implausible_age")

    date_column = profile.get("date_column")
    discharge_column = profile.get("discharge_date_column")
    if (
        date_column
        and discharge_column
        and date_column in frame.columns
        and discharge_column in frame.columns
    ):
        admitted = pd.to_datetime(frame[date_column], errors="coerce")
        discharged = pd.to_datetime(frame[discharge_column], errors="coerce")
        discharge_before_admission = admitted.notna() & discharged.notna() & (discharged < admitted)
        reject(discharge_before_admission, "discharge_before_admission")

    return frame[keep].copy(), reasons
