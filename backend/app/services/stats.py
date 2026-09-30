"""Small statistical helpers for the analytics services.

Plain Python on purpose: the formulas are short, and having them where they can
be read and tested against a reference implementation is worth more than a
library call nobody in the project would audit. (The one exception is the exact
Poisson interval, which needs scipy's chi-square quantile; scipy is already
present through scikit-learn.)

Every function here has a test that checks it against known values, including
one constructed so that the crude and the adjusted answer disagree - which is the
whole reason the adjusted version exists.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

Z95 = 1.959963984540054


def wilson_interval(successes: int, total: int, z: float = Z95) -> tuple[float, float]:
    """Wilson score interval for a proportion.

    Preferred over the normal approximation because it stays inside [0, 1] and
    behaves at small n and at rates near 0 or 1.
    """
    if total <= 0:
        return 0.0, 1.0
    p = successes / total
    denominator = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / denominator
    margin = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denominator
    return max(0.0, centre - margin), min(1.0, centre + margin)


@dataclass(frozen=True)
class OddsRatio:
    """An odds ratio with its 95% confidence interval."""

    value: float
    low: float
    high: float
    strata: int

    @property
    def significant(self) -> bool:
        """True when the interval excludes 1, i.e. no association is not plausible."""
        return self.low > 1.0 or self.high < 1.0


def crude_odds_ratio(a: int, b: int, c: int, d: int) -> OddsRatio | None:
    """Odds ratio from a single 2x2 table, with the Woolf interval.

    a, b: exposed with / without the event. c, d: unexposed with / without it.
    A zero cell gets the Haldane-Anscombe 0.5 correction rather than returning
    infinity, which is the conventional way to keep a sparse table usable.
    """
    if a + b == 0 or c + d == 0:
        return None
    if 0 in (a, b, c, d):
        a, b, c, d = a + 0.5, b + 0.5, c + 0.5, d + 0.5  # type: ignore[assignment]
    odds_ratio = (a * d) / (b * c)
    se = math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
    log_or = math.log(odds_ratio)
    return OddsRatio(
        value=odds_ratio,
        low=math.exp(log_or - Z95 * se),
        high=math.exp(log_or + Z95 * se),
        strata=1,
    )


def mantel_haenszel(tables: Iterable[Sequence[int]]) -> OddsRatio | None:
    """Mantel-Haenszel pooled odds ratio across strata.

    Each table is (a, b, c, d): exposed with the event, exposed without, unexposed
    with, unexposed without. Comparing exposed against unexposed *within* a stratum
    and pooling removes the confounding the stratifying variables carry.

    That matters here. Sicker patients get more intensive treatment, so a drug's
    crude readmission rate mostly reflects who was given it. Stratifying on age,
    prior admissions and diagnosis compares like with like.

    Variance is the Robins-Breslow-Greenland estimator, which stays valid when
    the strata are many and thin - as they are with hundreds of strata and a
    rare drug. Returns None when the pooled estimate is undefined (no events
    among the exposed, or none among the unexposed, in any informative stratum).
    """
    sum_r = sum_s = 0.0
    sum_pr = sum_ps_qr = sum_qs = 0.0
    used = 0

    for a, b, c, d in tables:
        n = a + b + c + d
        if n == 0 or (a + b) == 0 or (c + d) == 0:
            continue  # the stratum has nobody to compare
        used += 1

        r = a * d / n
        s = b * c / n
        p = (a + d) / n
        q = (b + c) / n

        sum_r += r
        sum_s += s
        sum_pr += p * r
        sum_ps_qr += p * s + q * r
        sum_qs += q * s

    if sum_r == 0 or sum_s == 0:
        return None

    odds_ratio = sum_r / sum_s
    variance = sum_pr / (2 * sum_r**2) + sum_ps_qr / (2 * sum_r * sum_s) + sum_qs / (2 * sum_s**2)
    se = math.sqrt(variance)
    log_or = math.log(odds_ratio)
    return OddsRatio(
        value=odds_ratio,
        low=math.exp(log_or - Z95 * se),
        high=math.exp(log_or + Z95 * se),
        strata=used,
    )


def poisson_interval(observed: int, confidence: float = 0.95) -> tuple[float, float]:
    """Exact (Garwood) confidence interval for a Poisson count.

    Exact rather than approximate because the approximations fail where it
    matters here. Byar's formula, the usual shortcut, is within 1% from five
    events upward but 48% off at one and 7% off at two - and a small department
    or a rare diagnosis produces exactly those counts. scipy is already in the
    dependency tree through scikit-learn, so there is no reason to approximate.
    """
    from scipy.stats import chi2

    if observed < 0:
        raise ValueError("a count cannot be negative")

    alpha = 1.0 - confidence
    low = 0.0 if observed == 0 else float(chi2.ppf(alpha / 2, 2 * observed)) / 2
    high = float(chi2.ppf(1 - alpha / 2, 2 * (observed + 1))) / 2
    return low, high


@dataclass(frozen=True)
class ObservedExpected:
    """Observed against expected events, with the interval on the ratio."""

    observed: int
    expected: float
    ratio: float
    low: float
    high: float

    @property
    def verdict(self) -> str:
        """'worse' / 'better' only when the interval excludes 1; otherwise 'as expected'."""
        if self.low > 1.0:
            return "worse than expected"
        if self.high < 1.0:
            return "better than expected"
        return "as expected"


def observed_expected(observed: int, expected: float) -> ObservedExpected | None:
    """Observed/expected ratio with an exact Poisson interval. None when expected is zero."""
    if expected <= 0:
        return None
    low, high = poisson_interval(observed)
    return ObservedExpected(
        observed=observed,
        expected=expected,
        ratio=observed / expected,
        low=low / expected,
        high=high / expected,
    )


def p_chart_limits(centre: float, sample_size: int, sigmas: float = 3.0) -> tuple[float, float]:
    """Control limits for a p-chart point with the given sample size.

    The limits narrow as the sample grows, so they are computed per point rather
    than once for the whole chart - buckets are rarely exactly equal in size.
    """
    if sample_size <= 0:
        return 0.0, 1.0
    half_width = sigmas * math.sqrt(centre * (1 - centre) / sample_size)
    return max(0.0, centre - half_width), min(1.0, centre + half_width)


def population_stability_index(
    reference: Sequence[float], current: Sequence[float], floor: float = 1e-4
) -> float:
    """Population Stability Index between two binned distributions.

    Inputs are the share of the population in each bin (each set summing to 1).
    Conventional reading: under 0.10 stable, 0.10 to 0.25 worth watching, over
    0.25 a material shift. A floor stops an empty bin producing an infinity.
    """
    if len(reference) != len(current):
        raise ValueError("both distributions need the same number of bins")

    total = 0.0
    for expected, actual in zip(reference, current, strict=True):
        expected = max(expected, floor)
        actual = max(actual, floor)
        total += (actual - expected) * math.log(actual / expected)
    return total
