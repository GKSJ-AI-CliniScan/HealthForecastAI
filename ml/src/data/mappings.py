"""Lookup tables for the Diabetes 130-US Hospitals dataset.

The raw CSV stores admission type, discharge disposition and admission source as
opaque integer ids. The dataset ships them in a separate IDS_mapping.csv; they
are reproduced here as code so the ETL is reproducible from the repository
alone, without a second download.

Source: UCI ML Repository dataset 296, IDS_mapping.csv.
"""

from __future__ import annotations

ADMISSION_TYPE: dict[int, str] = {
    1: "Emergency",
    2: "Urgent",
    3: "Elective",
    4: "Newborn",
    5: "Not Available",
    6: "NULL",
    7: "Trauma Center",
    8: "Not Mapped",
}

DISCHARGE_DISPOSITION: dict[int, str] = {
    1: "Discharged to home",
    2: "Discharged/transferred to another short term hospital",
    3: "Discharged/transferred to SNF",
    4: "Discharged/transferred to ICF",
    5: "Discharged/transferred to another type of inpatient care institution",
    6: "Discharged/transferred to home with home health service",
    7: "Left AMA",
    8: "Discharged/transferred to home under care of Home IV provider",
    9: "Admitted as an inpatient to this hospital",
    10: "Neonate discharged to another hospital for neonatal aftercare",
    11: "Expired",
    12: "Still patient or expected to return for outpatient services",
    13: "Hospice / home",
    14: "Hospice / medical facility",
    15: "Discharged/transferred within this institution to Medicare approved swing bed",
    16: "Discharged/transferred/referred another institution for outpatient services",
    17: "Discharged/transferred/referred to this institution for outpatient services",
    18: "NULL",
    19: "Expired at home. Medicaid only, hospice",
    20: "Expired in a medical facility. Medicaid only, hospice",
    21: "Expired, place unknown. Medicaid only, hospice",
    22: "Discharged/transferred to another rehab fac including rehab units of a hospital",
    23: "Discharged/transferred to a long term care hospital",
    24: "Discharged/transferred to a nursing facility certified under Medicaid",
    25: "Not Mapped",
    26: "Unknown/Invalid",
    27: "Discharged/transferred to a federal health care facility",
    28: "Discharged/transferred to a psychiatric hospital",
    29: "Discharged/transferred to a Critical Access Hospital (CAH)",
    30: "Discharged/transferred to another type of health care institution not defined",
}

ADMISSION_SOURCE: dict[int, str] = {
    1: "Physician Referral",
    2: "Clinic Referral",
    3: "HMO Referral",
    4: "Transfer from a hospital",
    5: "Transfer from a Skilled Nursing Facility (SNF)",
    6: "Transfer from another health care facility",
    7: "Emergency Room",
    8: "Court/Law Enforcement",
    9: "Not Available",
    10: "Transfer from critical access hospital",
    11: "Normal Delivery",
    12: "Premature Delivery",
    13: "Sick Baby",
    14: "Extramural Birth",
    15: "Not Available",
    17: "NULL",
    18: "Transfer From Another Home Health Agency",
    19: "Readmission to Same Home Health Agency",
    20: "Not Mapped",
    21: "Unknown/Invalid",
    22: "Transfer from hospital inpt/same fac reslt in a sep claim",
    23: "Born inside this hospital",
    24: "Born outside this hospital",
    25: "Transfer from Ambulatory Surgery Center",
    26: "Transfer from Hospice",
}

# An encounter ending in death or hospice transfer cannot be readmitted. Leaving
# these rows in the training set leaks the outcome into the target: the model
# learns "discharge_disposition_id == 11 implies no readmission", which is true
# and useless. The published analyses of this dataset all remove them.
NON_READMITTABLE_DISPOSITIONS: frozenset[int] = frozenset({11, 13, 14, 19, 20, 21})

# ICD-9 chapter grouping used by the Strack et al. (2014) paper on this dataset.
# Maps a numeric ICD-9 code to the clinical group the paper reports on.
ICD9_GROUPS: tuple[tuple[float, float, str], ...] = (
    (390, 459, "Circulatory"),
    (460, 519, "Respiratory"),
    (520, 579, "Digestive"),
    (580, 629, "Genitourinary"),
    (630, 679, "Pregnancy"),
    (680, 709, "Skin"),
    (710, 739, "Musculoskeletal"),
    (740, 759, "Congenital"),
    (800, 999, "Injury"),
    (140, 239, "Neoplasms"),
)


def group_diagnosis(code: str | float | None) -> str:
    """Map an ICD-9 diagnosis code onto its clinical group.

    Returns "Diabetes" for the 250.xx family, the chapter name for a code that
    falls in a known range, "Other" for anything else, and "Missing" for a
    blank. V and E codes are supplementary classifications, grouped as "Other".
    """
    if code is None:
        return "Missing"

    text = str(code).strip()
    if not text or text in {"?", "nan", "None"}:
        return "Missing"

    if text.startswith(("V", "E", "v", "e")):
        return "Other"

    try:
        value = float(text)
    except ValueError:
        return "Other"

    if 250 <= value < 251:
        return "Diabetes"

    for low, high, name in ICD9_GROUPS:
        if low <= value <= high:
            return name

    return "Other"


def parse_age_bracket(age: str | None) -> str | None:
    """Normalise the dataset's "[70-80)" age bracket into "70-80"."""
    if not age:
        return None
    return str(age).strip().strip("[)").replace("-", "-") or None


def midpoint_of_age_bracket(age: str | None) -> float | None:
    """Return the numeric midpoint of an age bracket, for use as a feature."""
    normalised = parse_age_bracket(age)
    if not normalised or "-" not in normalised:
        return None
    low, _, high = normalised.partition("-")
    try:
        return (float(low) + float(high)) / 2
    except ValueError:
        return None
