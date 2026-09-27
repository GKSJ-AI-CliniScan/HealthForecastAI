import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { pageState, sessionMock } from '@/test-utils/pageMocks';
import { sessionUser } from '@/test-utils/permissions';
import type { Report } from '@/types';

import ReportsPage from './page';

vi.mock('@/lib/session', () => sessionMock);
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => pageState.apiFetch(...args),
  apiFetchPage: (...args: unknown[]) => pageState.apiFetchPage(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function report(overrides: Partial<Report>): Report {
  return {
    id: 1,
    report_type: 'risk_distribution',
    format: 'pdf',
    generated_by: 7,
    generated_at: '2026-09-27T10:00:00Z',
    filters: {},
    file_size_bytes: 2048,
    download_url: '/api/v1/reports/1/download',
    ...overrides,
  };
}

beforeEach(() => {
  pageState.apiFetch.mockReset();
  pageState.apiFetchPage.mockReset();
});

async function renderPage(params: Record<string, string> = {}) {
  render(await ReportsPage({ searchParams: Promise.resolve(params) }));
}

describe('ReportsPage', () => {
  it('lists the history with owner, type, format and actions', async () => {
    pageState.user = sessionUser('researcher', 7);
    pageState.apiFetchPage.mockResolvedValue({
      items: [
        report({ id: 1 }),
        report({ id: 2, report_type: 'research_cohort', format: 'csv', filters: { diagnosis: 'Asthma' } }),
      ],
      total: 2,
    });
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Your reports' })).toBeInTheDocument();
    expect(screen.getAllByText('You')).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'Research cohort statistics' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Risk distribution' })).toBeInTheDocument();
    expect(screen.getByText('Primary diagnosis: Asthma')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: '2.0 KB' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /purge/i })).not.toBeInTheDocument();
  });

  it('shows the empty history state', async () => {
    pageState.user = sessionUser('hospital_admin');
    pageState.apiFetchPage.mockResolvedValue({ items: [], total: 0 });
    await renderPage();
    expect(screen.getByText(/no reports yet/i)).toBeInTheDocument();
  });

  it('resolves owner names for a system administrator and offers the purge', async () => {
    pageState.user = sessionUser('system_admin', 1);
    pageState.apiFetchPage.mockResolvedValue({ items: [report({ generated_by: 7 })], total: 1 });
    pageState.apiFetch.mockResolvedValue([
      { id: 7, email: 'r@h.org', full_name: 'Dr Research', role: 'researcher', department: null, is_active: true },
    ]);
    await renderPage();

    expect(screen.getByRole('heading', { name: 'All reports' })).toBeInTheDocument();
    expect(screen.getByText('Dr Research')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /purge expired reports/i })).toBeInTheDocument();
  });

  it('passes the type filter and page to the backend', async () => {
    pageState.user = sessionUser('researcher');
    pageState.apiFetchPage.mockResolvedValue({ items: [], total: 0 });
    await renderPage({ report_type: 'population_health', page: '3' });
    expect(pageState.apiFetchPage.mock.calls[0][0]).toBe(
      '/reports?report_type=population_health&limit=20&offset=40',
    );
  });

  it('keeps the generate form usable when the history fails to load', async () => {
    pageState.user = sessionUser('researcher');
    pageState.apiFetchPage.mockRejectedValue(new ApiError(500, 'boom'));
    await renderPage();

    expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not complete/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('refuses a doctor, who holds no analytics:export', async () => {
    pageState.user = sessionUser('doctor');
    await renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(/does not have access to reports/i);
    expect(pageState.apiFetchPage).not.toHaveBeenCalled();
  });
});
