"""Concurrent load test for the authenticated profile endpoint."""

import asyncio
from statistics import mean
from time import perf_counter

import httpx

from app.core.security import create_access_token

BASE_URL = "http://127.0.0.1:8000"
ENDPOINT = "/api/v1/auth/me"

CONCURRENT_REQUESTS = 5
REQUESTS_PER_WORKER = 20


async def make_requests(
    client: httpx.AsyncClient,
    token: str,
) -> list[tuple[int, float]]:
    """Send several authenticated requests using one persistent client."""

    results = []

    for _ in range(REQUESTS_PER_WORKER):
        start = perf_counter()

        response = await client.get(
            ENDPOINT,
            headers={"Authorization": f"Bearer {token}"},
        )

        elapsed_ms = (perf_counter() - start) * 1000

        results.append((response.status_code, elapsed_ms))

    return results


async def main() -> None:
    """Run concurrent authenticated requests and report latency."""

    token = create_access_token(
        subject="load-test@example.com",
        role="doctor",
    )

    total_requests = CONCURRENT_REQUESTS * REQUESTS_PER_WORKER

    start = perf_counter()

    async with httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=10.0,
        trust_env=False,
    ) as client:
        workers = [make_requests(client, token) for _ in range(CONCURRENT_REQUESTS)]

        worker_results = await asyncio.gather(*workers)

    total_elapsed_ms = (perf_counter() - start) * 1000

    results = [result for worker_result in worker_results for result in worker_result]

    latencies = sorted(latency for _, latency in results)
    print("\nSlowest 10 requests:")
    for latency in latencies[-10:]:
        print(f"{latency:.2f} ms")

    status_codes = [status for status, _ in results]

    successful = sum(status == 200 for status in status_codes)

    p50_index = len(latencies) // 2
    p95_index = min(len(latencies) - 1, int(len(latencies) * 0.95))
    p99_index = min(len(latencies) - 1, int(len(latencies) * 0.99))

    p50 = latencies[p50_index]
    p95 = latencies[p95_index]
    p99 = latencies[p99_index]

    print()
    print("=== HealthForecastAI API Load Test ===")
    print(f"Endpoint: {ENDPOINT}")
    print(f"Concurrent workers: {CONCURRENT_REQUESTS}")
    print(f"Requests per worker: {REQUESTS_PER_WORKER}")
    print(f"Total requests: {total_requests}")
    print(f"Successful requests: {successful}/{total_requests}")
    print(f"Average latency: {mean(latencies):.2f} ms")
    print(f"Minimum latency: {min(latencies):.2f} ms")
    print(f"Maximum latency: {max(latencies):.2f} ms")
    print(f"P50 latency: {p50:.2f} ms")
    print(f"P95 latency: {p95:.2f} ms")
    print(f"P99 latency: {p99:.2f} ms")
    print(f"Total test time: {total_elapsed_ms:.2f} ms")

    if successful != total_requests:
        raise SystemExit("FAIL: Some requests did not return HTTP 200.")

    if p95 >= 50:
        raise SystemExit("FAIL: P95 latency is not below 50 ms.")

    print("PASS: All requests succeeded and P95 latency is below 50 ms.")


if __name__ == "__main__":
    asyncio.run(main())
