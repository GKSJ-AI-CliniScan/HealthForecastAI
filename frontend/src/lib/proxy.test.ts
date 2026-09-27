import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getToken = vi.fn();
vi.mock('./session', () => ({ getToken: () => getToken() }));

import { GET as downloadReport } from '@/app/api/reports/[id]/download/route';
import { DELETE as deleteReport } from '@/app/api/reports/[id]/route';
import { POST as generateReport } from '@/app/api/reports/route';
import { GET as researchExport } from '@/app/api/research/export/route';

import { parseId, proxyToBackend } from './proxy';

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  getToken.mockResolvedValue('session-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  getToken.mockReset();
});

describe('proxyToBackend', () => {
  it('refuses without a session', async () => {
    getToken.mockResolvedValue(undefined);
    const response = await proxyToBackend('/reports');
    expect(response.status).toBe(401);
  });

  it('passes the backend status and detail through unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ detail: { error: 'cohort_too_small', minimum: 10, actual: 4 } }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const response = await proxyToBackend('/analytics/research-export');
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      detail: { error: 'cohort_too_small', minimum: 10, actual: 4 },
    });
  });

  it('reports an unreachable backend as 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    expect((await proxyToBackend('/reports')).status).toBe(502);
  });
});

describe('parseId', () => {
  it.each(['1', '42', '9999999999'])('accepts %s', (raw) => {
    expect(parseId(raw)).toBe(Number(raw));
  });

  it.each(['0', '-1', '1.5', '../users', '1/download', '', '01', '12345678901'])(
    'rejects %s',
    (raw) => {
      expect(parseId(raw)).toBeNull();
    },
  );
});

describe('report route handlers', () => {
  it('streams a report download with its content type and file name', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('%PDF-1.4', {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="risk_distribution_3_20260927.pdf"',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await downloadReport(new Request('http://app/api/reports/3/download'), params('3'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('risk_distribution_3');
    expect(await response.text()).toBe('%PDF-1.4');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/reports\/3\/download$/);
    expect((fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')).toBe(
      'Bearer session-token',
    );
  });

  it('rejects a path-like id before reaching the backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await deleteReport(new Request('http://app'), params('..%2Fusers'));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('relays a delete and its 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await deleteReport(new Request('http://app'), params('5'));
    expect(response.status).toBe(204);
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('relays the generate body as JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const body = { report_type: 'risk_distribution', format: 'csv', filters: { months: 6 } };
    const response = await generateReport(
      new Request('http://app/api/reports', { method: 'POST', body: JSON.stringify(body) }),
    );
    expect(response.status).toBe(201);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual(body);
  });

  it('rejects a generate request that is not JSON', async () => {
    const response = await generateReport(
      new Request('http://app/api/reports', { method: 'POST', body: 'not json' }),
    );
    expect(response.status).toBe(400);
  });

  it('forwards only the known cohort filters to the research export', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('pseudo_id\n', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await researchExport(
      new Request('http://app/api/research/export?diagnosis=Asthma&limit=100000&age_band=60-69'),
    );
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toMatch(/\/analytics\/research-export$/);
    expect(Object.fromEntries(url.searchParams)).toEqual({ diagnosis: 'Asthma', age_band: '60-69' });
  });
});
