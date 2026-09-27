import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { pageState, sessionMock } from '@/test-utils/pageMocks';
import { sessionUser } from '@/test-utils/permissions';

import PatientsPage from './page';

vi.mock('@/lib/session', () => sessionMock);
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => pageState.apiFetch(...args),
  apiFetchPage: (...args: unknown[]) => pageState.apiFetchPage(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

beforeEach(() => {
  pageState.apiFetch.mockReset();
  pageState.apiFetchPage.mockReset();
});

describe('PatientsPage', () => {
  it('shows a researcher the anonymised cohort instead of a 403', async () => {
    pageState.user = sessionUser('researcher');
    pageState.apiFetchPage.mockResolvedValue({
      items: [{ pseudo_id: 'PT-1', age_group: '60-69', gender: 'Male', primary_diagnosis: 'Asthma' }],
      total: 1,
    });
    render(await PatientsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('heading', { name: 'Anonymised patient cohort' })).toBeInTheDocument();
    expect(screen.getByText('PT-1')).toBeInTheDocument();
    expect(pageState.apiFetch).not.toHaveBeenCalled();
    expect(pageState.apiFetchPage.mock.calls[0][0]).toMatch(/^\/patients\/anonymised\?/);
  });

  it('keeps the identifiable list for a doctor', async () => {
    pageState.user = sessionUser('doctor');
    pageState.apiFetch.mockResolvedValue([
      {
        id: 3,
        medical_record_number: 'MRN-3',
        age_group: '61',
        gender: 'F',
        primary_diagnosis: 'Asthma',
        assigned_doctor_id: 7,
      },
    ]);
    render(await PatientsPage({ searchParams: Promise.resolve({ q: 'asth' }) }));

    expect(screen.getByText('MRN-3')).toBeInTheDocument();
    expect(pageState.apiFetch.mock.calls[0][0]).toBe('/patients?limit=100&q=asth');
  });

  it('offers a retry when the backend is down', async () => {
    pageState.user = sessionUser('hospital_admin');
    pageState.apiFetch.mockRejectedValue(new TypeError('fetch failed'));
    render(await PatientsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('explains a small anonymised cohort', async () => {
    pageState.user = sessionUser('researcher');
    pageState.apiFetchPage.mockRejectedValue(
      new ApiError(422, 'small', { error: 'cohort_too_small', minimum: 10, actual: 2 }),
    );
    render(await PatientsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('alert')).toHaveTextContent(/covers 2 records/);
  });
});
