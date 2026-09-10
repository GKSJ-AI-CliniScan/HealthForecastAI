"""Serving-side feature builder — training ke SAME functions ko call karta hai.

KYUN: feature_contract.json ke 51 me se 8 columns raw admission row me maujood
nahi hote; wo compute hote hain. Abhi model_service.predict_probability unhe
features.get(name) se uthata hai jahan wo hote hi nahi -> None -> imputer bhar
deta hai. Matlab total_prior_visits aur num_med_changes jaise strong signals
serving me model tak pahunchte hi nahi. Ye file wahi gap band karti hai.

DESIGN: yahan koi logic DOBARA nahi likha gaya — sab preprocess.py aur
build_features.py se import hota hai. Isse training-serving skew structurally
impossible hai: training logic badla to serving apne aap badal jayegi.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

from src.data.preprocess import (
    MISSING_AS_CATEGORY,
    MISSING_LABEL,
    add_age_features,
    add_diagnosis_groups,
)
from src.features.build_features import (
    add_medication_features,
    add_prior_visit_features,
)

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "artifacts" / "feature_contract.json"


@lru_cache(maxsize=1)
def _medication_columns() -> tuple[str, ...]:
    """Training-time par detect ki gayi medication columns ki list.

    KYUN file se: ek row par find_medication_columns() kaam nahi karta
    (nunique() > 1 chahiye). Aur per-row guess karna galat hai — `change`
    aur `diabetesMed` ke values bhi "No" ho sakte hain, jo DOSAGE_VALUES me
    aate hain aur galti se dawa maan liye jaate. Isliye list ek baar asli
    dataset se nikaal kar contract me likhi gayi hai.
    AAGE: build_serving_features ise add_medication_features ko pass karta hai.
    """
    data = json.loads(CONTRACT_PATH.read_text())
    return tuple(data.get("medication_columns", ()))


def build_serving_features(row: dict[str, Any]) -> dict[str, Any]:
    """Raw admission row lo, 51-column contract ke liye tayyar row lautao."""
    frame = pd.DataFrame([dict(row)])  # sab functions DataFrame lete hain

    # STEP 1: missing ko explicit "Missing" category banao.
    # KYUN: group_icd9_code() specifically "Missing" string dekhta hai;
    # None gaya to wo "Other" lautayega — training se alag natija.
    for column in MISSING_AS_CATEGORY:
        if column in frame.columns:
            frame[column] = frame[column].fillna(MISSING_LABEL).astype(str)
        else:
            frame[column] = MISSING_LABEL

    frame = add_diagnosis_groups(frame)  # diag_1/2/3_group
    frame = add_age_features(frame)  # age_numeric + age_group
    frame = add_prior_visit_features(frame)  # total_prior_visits

    # STEP 5: medication features — list contract se, taaki 1-row par bhi chale.
    # Jo columns row me nahi hain unhe "No" bhar dete hain: training me bhi
    # ek na-prescribe ki gayi dawa "No" hi hoti hai, isliye ginti same rehti hai.
    med_cols = list(_medication_columns())
    for column in med_cols:
        if column not in frame.columns:
            frame[column] = "No"
        else:
            frame[column] = frame[column].fillna("No").astype(str)
    frame = add_medication_features(frame, medication_columns=med_cols)

    return frame.iloc[0].to_dict()
