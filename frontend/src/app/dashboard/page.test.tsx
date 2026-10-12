import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SCORE_NOTES } from '@/components/ui/ModelDisclaimer';
import { pageState, routeResponses, sessionMock } from '@/test-utils/pageMocks';
import { sessionUser } from '@/test-utils/permissions';

import DashboardLayout from './layout';
import DashboardPage from './page';

vi.mock('@/lib/session', () => sessionMock);
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => pageState.apiFetch(...args),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard',
}));

const FORECAST = { scope: 'doctor', horizon_days: 30, predicted_readmissions: 3, predicted_rate: 0.3 };
const HIGH = {
  id: 1,
  patient_id: 5,
  admission_id: null,
  readmission_probability: 0.82,
  risk_category: 'high',
  prediction_type: 'risk',
  confidence_score: null,
  readmission_window: null,
  actual_readmitted: null,
  outcome_recorded_at: null,
  model_name: 'risk',
  model_version: 'v1',
  created_at: '2026-10-10T10:00:00Z',
};

function route(highRisk: unknown[]) {
  pageState.apiFetch.mockImplementation(
    routeResponses({ '/patients': [], '/risk/high-risk': highRisk, '/risk/forecast': FORECAST }),
  );
}

beforeEach(() => {
  pageState.apiFetch.mockReset();
  pageState.user = sessionUser('doctor');
});

describe('DashboardPage prediction wording', () => {
  it('shows the experimental notice with the overview', async () => {
    route([]);
    render(await DashboardLayout({ children: await DashboardPage() }));
    const note = screen.getByRole('note', { name: 'Experimental status' });
    const heading = screen.getByRole('heading', { name: /Welcome/ });
    expect(note.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('labels the score column "Model score" and drops the probability wording', async () => {
    route([HIGH]);
    render(await DashboardPage());

    expect(screen.getByRole('columnheader', { name: 'Model score' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Probability' })).not.toBeInTheDocument();
    expect(screen.getByText('0.82')).toBeInTheDocument();
    expect(screen.queryByText('82%')).not.toBeInTheDocument();
    expect(screen.getByText(SCORE_NOTES.riskScore)).toBeInTheDocument();
    expect(screen.getByText(SCORE_NOTES.bands)).toBeInTheDocument();
  });

  it('truncates the displayed score and keeps exactly 0.70 as 0.70', async () => {
    route([
      HIGH,
      { ...HIGH, id: 2, patient_id: 6, readmission_probability: 0.7 },
      { ...HIGH, id: 3, patient_id: 7, readmission_probability: 0.7399 },
    ]);
    render(await DashboardPage());

    expect(screen.getByText('0.82')).toBeInTheDocument();
    expect(screen.getByText('0.70')).toBeInTheDocument();
    expect(screen.getByText('0.73')).toBeInTheDocument();
    expect(screen.queryByText('0.74')).not.toBeInTheDocument();
  });

  it('uses the approved empty state for the high band', async () => {
    route([]);
    render(await DashboardPage());
    expect(
      screen.getByText(
        'No scored patient is currently in the high band. Patients who have not been scored are not shown.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/currently in the high risk band/)).not.toBeInTheDocument();
  });

  it('describes the aggregate card as scored patients only, not a hospital-wide forecast', async () => {
    route([]);
    render(await DashboardPage());

    expect(
      screen.getByRole('heading', { name: '30-day readmission scores (scored patients only)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Scored patients at or above 0.50')).toBeInTheDocument();
    expect(screen.getByText('Share of scored patients')).toBeInTheDocument();
    expect(screen.getByText(SCORE_NOTES.aggregateForecast)).toBeInTheDocument();
    expect(screen.queryByText('Predicted readmissions')).not.toBeInTheDocument();
    expect(screen.queryByText('Predicted rate')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Scope:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Patients included: scored patients visible to your role/)).toBeInTheDocument();
  });
});
