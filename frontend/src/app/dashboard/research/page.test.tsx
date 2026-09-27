import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { pageState, routeResponses, sessionMock } from '@/test-utils/pageMocks';
import { sessionUser } from '@/test-utils/permissions';

import ResearchPage from './page';

vi.mock('@/lib/session', () => sessionMock);
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => pageState.apiFetch(...args),
  apiFetchPage: (...args: unknown[]) => pageState.apiFetchPage(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const STATS = {
  cohort_size: 12,
  age_band_distribution: { '60-69': 12 },
  gender_distribution: { Female: 6, Male: 6 },
  diagnosis_distribution: { 'Cardiac failure': 12 },
};

const COHORT = {
  items: [
    { pseudo_id: 'PT-AAAA', age_group: '60-69', gender: 'Female', primary_diagnosis: 'Cardiac failure' },
  ],
  total: 12,
};

beforeEach(() => {
  pageState.apiFetch.mockReset();
  pageState.apiFetchPage.mockReset();
  pageState.apiFetch.mockImplementation(routeResponses({ '/analytics/research-cohort': STATS }));
  pageState.apiFetchPage.mockResolvedValue(COHORT);
});

async function renderPage(params: Record<string, string> = {}) {
  render(await ResearchPage({ searchParams: Promise.resolve(params) }));
}

describe('ResearchPage', () => {
  it('gives a researcher statistics, the anonymised cohort and the export', async () => {
    pageState.user = sessionUser('researcher');
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Cohort statistics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeInTheDocument();
    const cohort = screen.getByRole('heading', { name: 'Anonymised cohort' }).closest('section');
    expect(within(cohort as HTMLElement).getByText('PT-AAAA')).toBeInTheDocument();
  });

  it('never renders an identifier column or a link to a patient record', async () => {
    pageState.user = sessionUser('researcher');
    await renderPage();

    expect(screen.queryByText(/record number/i)).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.includes('/patients/')),
    ).toEqual([]);
  });

  it('passes the cohort filters to both backend reads', async () => {
    pageState.user = sessionUser('researcher');
    await renderPage({ diagnosis: 'Asthma', age_band: '60-69', page: '2' });

    expect(pageState.apiFetch.mock.calls[0][0]).toBe(
      '/analytics/research-cohort?diagnosis=Asthma&age_band=60-69',
    );
    expect(pageState.apiFetchPage.mock.calls[0][0]).toBe(
      '/patients/anonymised?diagnosis=Asthma&age_band=60-69&limit=25&offset=25',
    );
  });

  it('gives a hospital administrator statistics only - no row-level cohort or export', async () => {
    pageState.user = sessionUser('hospital_admin');
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Cohort statistics' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Anonymised cohort' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download CSV' })).not.toBeInTheDocument();
    expect(pageState.apiFetchPage).not.toHaveBeenCalled();
  });

  it('explains a cohort that is too small', async () => {
    pageState.user = sessionUser('researcher');
    const refusal = new ApiError(422, 'small', { error: 'cohort_too_small', minimum: 10, actual: 3 });
    pageState.apiFetch.mockRejectedValue(refusal);
    pageState.apiFetchPage.mockRejectedValue(refusal);
    await renderPage({ diagnosis: 'Rare' });

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent(/covers 3 records/);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('refuses a doctor without calling the backend', async () => {
    pageState.user = sessionUser('doctor');
    await renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(/does not have access to research/i);
    expect(pageState.apiFetch).not.toHaveBeenCalled();
    expect(pageState.apiFetchPage).not.toHaveBeenCalled();
  });
});
