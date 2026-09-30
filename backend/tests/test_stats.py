"""Tests for the statistical helpers.

The reference values below come from statsmodels and scipy, which the same
functions were verified against on thousands of random tables (agreement to
1e-13). They are pinned here so the formulas cannot drift unnoticed.

The most important test is the Simpson's paradox one: a drug with no effect at
all looks harmful on crude rates because it is given to sicker patients. That is
the whole reason treatment effectiveness is stratified.
"""

import pytest

from app.services import stats


def test_wilson_interval_matches_the_reference() -> None:
    low, high = stats.wilson_interval(15, 50)
    assert low == pytest.approx(0.191036, abs=1e-6)
    assert high == pytest.approx(0.437504, abs=1e-6)


def test_wilson_interval_stays_inside_zero_and_one_at_the_extremes() -> None:
    assert stats.wilson_interval(0, 20) == pytest.approx((0.0, 0.161125), abs=1e-6)
    assert stats.wilson_interval(20, 20) == pytest.approx((0.838875, 1.0), abs=1e-6)


def test_wilson_interval_with_no_observations_is_uninformative() -> None:
    assert stats.wilson_interval(0, 0) == (0.0, 1.0)


@pytest.mark.parametrize(
    ("count", "low", "high"),
    [(0, 0.0, 3.6889), (1, 0.0253, 5.5716), (2, 0.2422, 7.2247), (10, 4.7954, 18.3904)],
)
def test_poisson_interval_is_exact_even_for_tiny_counts(
    count: int, low: float, high: float
) -> None:
    """Byar's shortcut was 48% off at one event; the exact interval is not."""
    actual_low, actual_high = stats.poisson_interval(count)
    assert actual_low == pytest.approx(low, abs=1e-3)
    assert actual_high == pytest.approx(high, abs=1e-3)


def test_poisson_interval_rejects_a_negative_count() -> None:
    with pytest.raises(ValueError):
        stats.poisson_interval(-1)


def test_crude_odds_ratio_matches_the_reference() -> None:
    result = stats.crude_odds_ratio(20, 80, 10, 90)
    assert result is not None
    assert result.value == pytest.approx(2.25)
    assert result.low == pytest.approx(0.994295, abs=1e-6)
    assert result.high == pytest.approx(5.091548, abs=1e-6)


def test_crude_odds_ratio_survives_a_zero_cell() -> None:
    """A sparse table gets the 0.5 correction instead of an infinite ratio."""
    result = stats.crude_odds_ratio(0, 50, 5, 45)
    assert result is not None
    assert 0 < result.value < 1


def test_crude_odds_ratio_is_undefined_with_an_empty_group() -> None:
    assert stats.crude_odds_ratio(0, 0, 5, 45) is None


def test_mantel_haenszel_matches_the_reference() -> None:
    result = stats.mantel_haenszel([[12, 88, 8, 92], [30, 170, 25, 175], [5, 45, 9, 141]])
    assert result is not None
    assert result.value == pytest.approx(1.371058, abs=1e-6)
    assert result.low == pytest.approx(0.874209, abs=1e-6)
    assert result.high == pytest.approx(2.150285, abs=1e-6)
    assert result.strata == 3


def test_a_single_stratum_reduces_to_the_crude_odds_ratio() -> None:
    pooled = stats.mantel_haenszel([[20, 80, 10, 90]])
    crude = stats.crude_odds_ratio(20, 80, 10, 90)
    assert pooled is not None and crude is not None
    assert pooled.value == pytest.approx(crude.value)


def test_confounding_by_indication_is_removed_by_stratifying() -> None:
    """Simpson's paradox, built to be exact.

    A drug with NO effect: within the sick stratum 50% are readmitted whether
    treated or not, and within the well stratum 10% are either way. But 80% of
    the treated are sick, against 20% of the untreated. Compared crudely the drug
    looks like it triples the odds of readmission. Stratified, it does nothing.
    """
    sick = [40, 40, 10, 10]  # treated 80: 50% ill-outcome; untreated 20: 50%
    well = [2, 18, 8, 72]  # treated 20: 10%; untreated 80: 10%

    crude = stats.crude_odds_ratio(
        sick[0] + well[0], sick[1] + well[1], sick[2] + well[2], sick[3] + well[3]
    )
    adjusted = stats.mantel_haenszel([sick, well])

    assert crude is not None and adjusted is not None
    assert crude.value == pytest.approx(3.30, abs=0.01), "the crude number is badly misleading"
    assert crude.significant, "and it would be reported as significant"
    assert adjusted.value == pytest.approx(1.0, abs=1e-9), "stratified, there is no effect"
    assert not adjusted.significant


def test_strata_with_nobody_to_compare_are_ignored() -> None:
    """A stratum with no exposed (or no unexposed) patients carries no information."""
    with_empty = stats.mantel_haenszel([[12, 88, 8, 92], [0, 0, 5, 45], [30, 170, 25, 175]])
    without = stats.mantel_haenszel([[12, 88, 8, 92], [30, 170, 25, 175]])
    assert with_empty is not None and without is not None
    assert with_empty.value == pytest.approx(without.value)
    assert with_empty.strata == 2


def test_mantel_haenszel_is_undefined_when_the_exposed_have_no_events() -> None:
    assert stats.mantel_haenszel([[0, 100, 5, 95], [0, 50, 4, 46]]) is None


def test_observed_expected_flags_only_what_the_interval_supports() -> None:
    """A point estimate above 1 is not 'worse' unless the interval excludes 1."""
    noisy = stats.observed_expected(6, 4.0)
    assert noisy is not None
    assert noisy.ratio == pytest.approx(1.5)
    assert noisy.verdict == "as expected", "six events against four is not evidence"

    clear = stats.observed_expected(400, 300.0)
    assert clear is not None
    assert clear.verdict == "worse than expected"

    better = stats.observed_expected(200, 300.0)
    assert better is not None
    assert better.verdict == "better than expected"


def test_observed_expected_with_nothing_expected_is_undefined() -> None:
    assert stats.observed_expected(3, 0.0) is None


def test_p_chart_limits_narrow_as_the_sample_grows() -> None:
    small = stats.p_chart_limits(0.09, 100)
    large = stats.p_chart_limits(0.09, 10000)
    assert (small[1] - small[0]) > (large[1] - large[0])
    assert small[0] >= 0.0 and large[1] <= 1.0


def test_p_chart_lower_limit_never_goes_below_zero() -> None:
    low, _ = stats.p_chart_limits(0.02, 20)
    assert low == 0.0


def test_psi_is_zero_for_identical_distributions() -> None:
    same = [0.1, 0.2, 0.3, 0.4]
    assert stats.population_stability_index(same, same) == pytest.approx(0.0)


def test_psi_grows_with_the_size_of_the_shift() -> None:
    reference = [0.25, 0.25, 0.25, 0.25]
    mild = stats.population_stability_index(reference, [0.27, 0.25, 0.25, 0.23])
    large = stats.population_stability_index(reference, [0.55, 0.25, 0.1, 0.1])
    assert 0 < mild < 0.1 < 0.25 < large


def test_psi_survives_an_empty_bin() -> None:
    value = stats.population_stability_index([0.5, 0.5], [1.0, 0.0])
    assert value > 0 and value == value  # finite, not NaN


def test_psi_rejects_mismatched_bins() -> None:
    with pytest.raises(ValueError):
        stats.population_stability_index([0.5, 0.5], [1.0])
