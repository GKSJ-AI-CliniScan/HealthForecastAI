"""Load test for a running HealthForecast AI API - Milestone 4.

Signs in once per role, then fires a realistic mix of read requests at a fixed
concurrency for a fixed duration and reports latency percentiles, throughput and
the error rate. Uses only httpx (already a backend dependency).

    python scripts/loadtest.py --password '<seed password>' \
        --concurrency 20 --seconds 30

It is a smoke-level load test from one machine, useful for finding an endpoint
that falls over or a regression between releases. It is not a capacity plan.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import time
from collections import defaultdict

import httpx

ACCOUNTS = {
    "doctor": "dr.reddy@healthforecast.org",
    "hospital_admin": "admin.ops@healthforecast.org",
    "researcher": "researcher@healthforecast.org",
}

# (role, method, path, weight): the mix approximates a working day - dashboards
# and patient lists dominate, heavy reports are rare.
MIX = [
    ("doctor", "GET", "/analytics/dashboard", 10),
    ("doctor", "GET", "/patients?limit=25", 12),
    ("doctor", "GET", "/treatment", 3),
    ("doctor", "GET", "/clinical-support/recommendations/{patient}", 5),
    ("doctor", "POST", "/risk/predict", 8),
    ("hospital_admin", "GET", "/analytics/dashboard", 8),
    ("hospital_admin", "GET", "/analytics/summary", 4),
    ("hospital_admin", "GET", "/analytics/performance?dimension=department", 3),
    ("hospital_admin", "GET", "/analytics/trends", 3),
    ("hospital_admin", "GET", "/risk/forecast", 2),
    ("hospital_admin", "GET", "/treatment/recovery", 2),
    ("researcher", "GET", "/analytics/population-health", 2),
]
PREDICT_BODY = {"time_in_hospital": 6, "number_inpatient": 1, "num_medications": 15}
PATIENT_ID = {"value": 1}


def percentile(values: list[float], q: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(q * len(ordered)))]


async def sign_in(client: httpx.AsyncClient, password: str) -> dict[str, str]:
    tokens = {}
    for role, email in ACCOUNTS.items():
        response = await client.post("/auth/login", json={"email": email, "password": password})
        response.raise_for_status()
        tokens[role] = response.json()["access_token"]
    return tokens


async def worker(
    client: httpx.AsyncClient,
    tokens: dict[str, str],
    deadline: float,
    samples: dict[str, list[float]],
    failures: dict[str, int],
    schedule: list[tuple[str, str, str]],
    offset: int,
) -> None:
    i = offset
    while time.perf_counter() < deadline:
        role, method, path = schedule[i % len(schedule)]
        path = path.replace("{patient}", str(PATIENT_ID["value"]))
        i += 1
        headers = {"Authorization": f"Bearer {tokens[role]}"}
        started = time.perf_counter()
        try:
            if method == "POST":
                response = await client.post(
                    path, json={**PREDICT_BODY, "patient_id": PATIENT_ID["value"]}, headers=headers
                )
            else:
                response = await client.get(path, headers=headers)
            ok = response.status_code < 400
        except httpx.HTTPError:
            ok = False
        elapsed = (time.perf_counter() - started) * 1000
        key = f"{method} {path.split('?')[0]}"
        samples[key].append(elapsed)
        if not ok:
            failures[key] += 1


async def run(args: argparse.Namespace) -> dict:
    limits = httpx.Limits(max_connections=args.concurrency * 2)
    async with httpx.AsyncClient(
        base_url=f"{args.base_url.rstrip('/')}/api/v1", timeout=60, limits=limits
    ) as client:
        tokens = await sign_in(client, args.password)
        first = await client.get(
            "/patients?limit=1", headers={"Authorization": f"Bearer {tokens['doctor']}"}
        )
        first.raise_for_status()
        PATIENT_ID["value"] = first.json()["items"][0]["id"]

        schedule = [(r, m, p) for r, m, p, w in MIX for _ in range(w)]
        samples: dict[str, list[float]] = defaultdict(list)
        failures: dict[str, int] = defaultdict(int)

        started = time.perf_counter()
        deadline = started + args.seconds
        await asyncio.gather(
            *(
                worker(client, tokens, deadline, samples, failures, schedule, n * 7)
                for n in range(args.concurrency)
            )
        )
        wall = time.perf_counter() - started

    everything = [v for values in samples.values() for v in values]
    rows = {
        key: {
            "requests": len(values),
            "errors": failures.get(key, 0),
            "p50_ms": round(statistics.median(values), 1),
            "p95_ms": round(percentile(values, 0.95), 1),
            "p99_ms": round(percentile(values, 0.99), 1),
        }
        for key, values in sorted(samples.items())
    }
    return {
        "concurrency": args.concurrency,
        "seconds": round(wall, 1),
        "requests": len(everything),
        "requests_per_second": round(len(everything) / wall, 1),
        "error_rate": round(sum(failures.values()) / max(len(everything), 1), 4),
        "p50_ms": round(statistics.median(everything), 1),
        "p95_ms": round(percentile(everything, 0.95), 1),
        "p99_ms": round(percentile(everything, 0.99), 1),
        "endpoints": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--password", required=True, help="Password of the demo accounts")
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--seconds", type=int, default=20)
    parser.add_argument("--json", action="store_true", help="Print raw JSON only")
    args = parser.parse_args()

    result = asyncio.run(run(args))
    if args.json:
        print(json.dumps(result, indent=2))
        return

    print(
        f"{result['requests']} requests in {result['seconds']}s at concurrency "
        f"{result['concurrency']}: {result['requests_per_second']} req/s, "
        f"errors {result['error_rate']:.2%}"
    )
    print(
        f"overall p50 {result['p50_ms']} ms  p95 {result['p95_ms']} ms  p99 {result['p99_ms']} ms\n"
    )
    print(f"{'endpoint':52} {'n':>6} {'err':>4} {'p50':>8} {'p95':>8} {'p99':>8}")
    for key, row in result["endpoints"].items():
        print(
            f"{key:52} {row['requests']:>6} {row['errors']:>4} "
            f"{row['p50_ms']:>8} {row['p95_ms']:>8} {row['p99_ms']:>8}"
        )


if __name__ == "__main__":
    main()
