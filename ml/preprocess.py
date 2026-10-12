"""HealthForecast AI — Diabetes 130-US Hospitals Preprocessing Entrypoint."""

from src.data.preprocess import map_icd9_to_category


def main() -> None:
    """Run demonstration ICD-9 clinical classification."""
    sample_codes = ["250.01", "414", "486", "584", "V45", "E878"]
    for code in sample_codes:
        print(f"ICD-9 Code {code} -> Category: {map_icd9_to_category(code)}")


if __name__ == "__main__":
    main()
