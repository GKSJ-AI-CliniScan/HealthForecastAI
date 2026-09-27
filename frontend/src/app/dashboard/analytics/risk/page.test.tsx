import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { pageState, routeResponses, sessionMock } from '@/test-utils/pageMocks';
import { sessionUser } from '@/test-utils/permissions';

import RiskDistributionPage from './page';

vi.mock('@/lib/session', () => sessionMock);
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => pageState.apiFetch(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const SUMMARY = {
  total_patients: 30,
  total_admissions: 40,
  readmission_rate: 0.25,
  average_length_of_stay: 4.5,
  risk_distribution: { low: 12, medium: 10, high: 8 },
};

async function renderPage() {
  render(await RiskDistributionPage({ searchParams: Promise.resolve({}) }));
}

beforeEach(() => {
  pageState.apiFetch.mockReset();
  pageState.user = sessionUser('hospital_admin');
});

describe('RiskDistributionPage', () => {
  it('renders the latest distribution and the trend', async () => {
    pageState.apiFetch.mockImplementation(
      routeResponses({
        '/analytics/summary': SUMMARY,
        '/analytics/trends': [{ period: '2026-01', total: 3, breakdown: { low: 1, medium: 1, high: 1 } }],
      }),
    );
    await renderPage();

    expect(screen.getByText('High risk').nextSibling).toHaveTextContent('8');
    expect(screen.getByRole('img', { name: 'Monthly risk scores by category' })).toBeInTheDocument();
    expect(pageState.apiFetch).toHaveBeenCalledWith(
      '/analytics/trends?metric=risk&months=12',
      expect.anything(),
      'test-token',
    );
  });

  it('shows empty states when nothing has been scored', async () => {
    pageState.apiFetch.mockImplementation(
      routeResponses({
        '/analytics/summary': { ...SUMMARY, risk_distribution: { low: 0, medium: 0, high: 0 } },
        '/analytics/trends': [],
      }),
    );
    await renderPage();

    expect(screen.getByText('No patient has been risk-scored yet.')).toBeInTheDocument();
    expect(screen.getByText('No risk scores have been issued yet.')).toBeInTheDocument();
  });

  it('keeps one failing section from blanking the page, with a retry', async () => {
    pageState.apiFetch.mockImplementation(
      routeResponses({
        '/analytics/summary': SUMMARY,
        '/analytics/trends': new ApiError(503, 'down'),
      }),
    );
    await renderPage();

    expect(screen.getByText('Low risk')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not complete this request/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('explains a 403 without a retry', async () => {
    pageState.apiFetch.mockRejectedValue(new ApiError(403, 'forbidden'));
    await renderPage();

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/does not have access/i);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('never calls the backend for a doctor, who would always get 403', async () => {
    pageState.user = sessionUser('doctor');
    await renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(/does not have access/i);
    expect(pageState.apiFetch).not.toHaveBeenCalled();
  });

  it('honours a valid months choice and ignores an invalid one', async () => {
    pageState.apiFetch.mockImplementation(
      routeResponses({ '/analytics/summary': SUMMARY, '/analytics/trends': [] }),
    );
    render(await RiskDistributionPage({ searchParams: Promise.resolve({ months: '24' }) }));
    render(await RiskDistributionPage({ searchParams: Promise.resolve({ months: '9999' }) }));

    const trendCalls = pageState.apiFetch.mock.calls
      .map(([path]) => path as string)
      .filter((path) => path.startsWith('/analytics/trends'));
    expect(trendCalls).toEqual([
      '/analytics/trends?metric=risk&months=24',
      '/analytics/trends?metric=risk&months=12',
    ]);
  });
});
