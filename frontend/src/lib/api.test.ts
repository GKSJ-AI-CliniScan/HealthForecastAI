import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch, apiFetchPage, apiRequest } from './api';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    status: init.status ?? 200,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('sends the bearer token and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ total_patients: 3 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/analytics/summary', {}, 'tok')).resolves.toEqual({ total_patients: 3 });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok');
  });

  it('keeps the backend detail on the thrown ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { detail: { error: 'cohort_too_small', minimum: 10, actual: 2 } },
          { status: 422 },
        ),
      ),
    );

    const error = await apiFetch('/analytics/population-health').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).detail).toEqual({ error: 'cohort_too_small', minimum: 10, actual: 2 });
  });

  it('tolerates an error response that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));
    const error = (await apiFetch('/x').catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.detail).toBeUndefined();
  });

  it('only declares a JSON content type when a body is sent', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/reports');
    expect((fetchMock.mock.calls[0][1].headers as Headers).has('Content-Type')).toBe(false);

    await apiFetch('/reports/generate', { method: 'POST', body: '{}' });
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('Content-Type')).toBe(
      'application/json',
    );
  });
});

describe('apiRequest', () => {
  it('returns a 204 response without trying to parse it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const response = await apiRequest('/reports/1', { method: 'DELETE' });
    expect(response.status).toBe(204);
  });
});

describe('apiFetchPage', () => {
  it('reads the total from X-Total-Count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }], { headers: { 'X-Total-Count': '41' } })),
    );
    await expect(apiFetchPage('/reports')).resolves.toEqual({ items: [{ id: 1 }], total: 41 });
  });

  it('falls back to the page length when the header is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }, { id: 2 }])));
    await expect(apiFetchPage('/reports')).resolves.toMatchObject({ total: 2 });
  });
});
