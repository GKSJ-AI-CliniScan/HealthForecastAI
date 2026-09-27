"""Spreadsheet formula-injection protection shared by every export."""

# A cell starting with one of these is evaluated as a formula by Excel/Sheets
# (CSV injection), and openpyxl itself stores such a string as a formula.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def neutralise_formula(value: str) -> str:
    """Prefix a would-be formula with an apostrophe so it is shown as text."""
    return f"'{value}" if value.startswith(_FORMULA_PREFIXES) else value
