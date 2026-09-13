from app.services.model_service import format_driver_name


def test_format_numeric_driver_name() -> None:
    assert format_driver_name(
        "numeric__number_inpatient"
    ) == "Previous inpatient visits"


def test_format_categorical_diagnosis_driver_name() -> None:
    assert format_driver_name(
        "categorical__diag_3_V45"
    ) == "Additional diagnosis: V45"


def test_format_age_driver_name() -> None:
    assert format_driver_name(
        "categorical__age_infrequent_sklearn"
    ) == "Age group"
