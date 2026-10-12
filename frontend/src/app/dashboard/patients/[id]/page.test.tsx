import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SCORE_NOTES } from '@/components/ui/ModelDisclaimer';
import { pageState, sessionMock } from '@/test-utils/pageMocks';
import { sessionUser } from '@/test-utils/permissions';

import DashboardLayout from '../../layout';
import PatientDetailPage from './page';

vi.mock('@/lib/session', () => sessionMock);
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => pageState.apiFetch(...args),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard/patients/1',
}));

const PATIENT = {
  id: 1,
  medical_record_number: 'MRN-TEST-1',
  age_group: '60-69',
  gender: 'Female',
  primary_diagnosis: 'Heart failure',
  assigned_doctor_id: 7,
  assigned_doctor_name: 'Dr Example',
};
const ADMISSION = {
  id: 10,
  patient_id: 1,
  admission_date: '2026-09-01',
  discharge_date: '2026-09-05',
  time_in_hospital: 4,
  admission_type: 'Emergency',
  discharge_disposition: 'Home',
  num_medications: null,
  num_lab_procedures: null,
  number_diagnoses: 3,
  readmitted: null,
  department: 'Cardiology',
};
const prediction = (over: Record<string, unknown>) => ({
  id: 1,
  patient_id: 1,
  admission_id: null,
  readmission_probability: 0.62,
  risk_category: 'medium',
  prediction_type: 'risk',
  confidence_score: null,
  readmission_window: null,
  actual_readmitted: null,
  outcome_recorded_at: null,
  model_name: 'risk',
  model_version: 'v1',
  created_at: '2026-10-10T10:00:00Z',
  ...over,
});
const RISK = prediction({});
const FORECAST = prediction({
  id: 2,
  admission_id: 10,
  readmission_probability: 0.35,
  prediction_type: 'readmission',
  // Present in the API, but the page must no longer show it as "Confidence".
  confidence_score: 0.87,
  readmission_window: '30_day',
  model_name: 'readmission',
});

function respond(path: string): unknown {
  const table: Record<string, unknown> = {
    '/patients/1': PATIENT,
    '/patients/1/admissions': [ADMISSION],
    '/patients/1/admissions/readmissions': {
      patient_id: 1,
      total_admissions: 1,
      readmitted_total: 0,
      by_label: { NO: 1 },
    },
    '/risk/1': RISK,
    '/risk/1?type=readmission': FORECAST,
    '/risk/1/history': [RISK],
    '/risk/1/history?type=readmission': [FORECAST],
    '/clinical-support/recommendations/1': {
      patient_id: 1,
      risk_category: 'medium',
      based_on_prediction_id: 1,
      recommendations: [{ category: 'follow_up', text: 'Schedule a 14-day follow-up call.' }],
      follow_up_days: 14,
    },
    '/clinical-support/discharge-plan/1': {
      patient_id: 1,
      risk_category: 'medium',
      based_on_prediction_id: 1,
      risk_mitigation: [],
      discharge_checklist: [{ category: 'discharge_checklist', text: 'Provide written instructions.' }],
      ready_for_discharge: true,
    },
    '/patients/1/admissions/10/treatments': [],
  };
  if (!(path in table)) {
    throw new TypeError(`unexpected request ${path}`);
  }
  return table[path];
}

async function renderPatient() {
  const page = await PatientDetailPage({ params: Promise.resolve({ id: '1' }) });
  render(await DashboardLayout({ children: page }));
}

beforeEach(() => {
  pageState.apiFetch.mockReset();
  pageState.apiFetch.mockImplementation(async (path: string) => respond(path));
  pageState.user = sessionUser('doctor');
});

describe('PatientDetailPage prediction wording', () => {
  it('shows the experimental notice above the patient record', async () => {
    await renderPatient();
    const note = screen.getByRole('note', { name: 'Experimental status' });
    const card = screen.getByRole('heading', { name: 'Risk & recommendations' });
    expect(note.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('presents both outputs as experimental model scores with their own targets', async () => {
    await renderPatient();

    expect(screen.getByText('Model score 0.62')).toBeInTheDocument();
    expect(screen.getByText(/Model score 0\.35/)).toBeInTheDocument();
    expect(screen.getByText(SCORE_NOTES.riskScore)).toBeInTheDocument();
    expect(screen.getByText(SCORE_NOTES.readmissionScore)).toBeInTheDocument();
    // One band explanation under each coloured score.
    expect(screen.getAllByText(SCORE_NOTES.bands)).toHaveLength(2);
  });

  it('no longer labels a score as a probability or shows "Confidence"', async () => {
    await renderPatient();

    expect(screen.queryByText(/\d+% probability/i)).not.toBeInTheDocument();
    expect(screen.queryByText('62% probability')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Confidence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/87%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\b62%/)).not.toBeInTheDocument();
  });

  it('explains the rule-based recommendations and the history chart', async () => {
    await renderPatient();

    // Care/follow-up list and discharge checklist each carry the caveat.
    expect(screen.getAllByText(SCORE_NOTES.recommendations)).toHaveLength(2);
    expect(screen.getByText(SCORE_NOTES.history)).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Experimental risk score and 30-day readmission score over time',
      }),
    ).toBeInTheDocument();
    // The recommendation text itself is unchanged.
    expect(screen.getByText('Schedule a 14-day follow-up call.')).toBeInTheDocument();
  });

  it('truncates scores so the shown value never reaches a cut-off its band has not', async () => {
    // Unrounded 0.6951 is MEDIUM (< 0.70) and 0.3999 is LOW (< 0.40); rounding
    // would have shown "0.70" and "0.40" beside those badges.
    pageState.apiFetch.mockImplementation(async (path: string) => {
      if (path === '/risk/1') return prediction({ readmission_probability: 0.6951, risk_category: 'medium' });
      if (path === '/risk/1?type=readmission') {
        return prediction({
          id: 2,
          admission_id: 10,
          readmission_probability: 0.3999,
          risk_category: 'low',
          prediction_type: 'readmission',
        });
      }
      return respond(path);
    });
    await renderPatient();

    expect(screen.getByText('Model score 0.69')).toBeInTheDocument();
    // The forecast's score and its horizon are separate elements since the
    // redesign; the horizon is shown in words, never as the raw "30_day" code.
    expect(screen.getByText('Model score 0.39')).toBeInTheDocument();
    expect(screen.getByText('30-day horizon')).toBeInTheDocument();
    expect(screen.queryByText(/30_day/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model score 0\.70/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model score 0\.40/)).not.toBeInTheDocument();
    // The bands themselves still come from the API value, unchanged.
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('shows a score of exactly 0.70 as 0.70 in the HIGH band', async () => {
    pageState.apiFetch.mockImplementation(async (path: string) =>
      path === '/risk/1'
        ? prediction({ readmission_probability: 0.7, risk_category: 'high' })
        : respond(path),
    );
    await renderPatient();

    expect(screen.getByText('Model score 0.70')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('still explains what a missing score means', async () => {
    pageState.apiFetch.mockImplementation(async (path: string) => {
      if (path === '/risk/1' || path === '/risk/1?type=readmission') {
        throw new Error('not found');
      }
      return respond(path);
    });
    await renderPatient();

    expect(screen.getByText('Not scored yet.')).toBeInTheDocument();
    expect(screen.getByText(SCORE_NOTES.riskScore)).toBeInTheDocument();
    expect(screen.queryByText(SCORE_NOTES.bands)).not.toBeInTheDocument();
  });
});

describe('PatientDetailPage demographics layout', () => {
  const twoColumns = (grid: Element | null) => grid?.className.includes('lg:grid-cols-') ?? false;

  it('puts the readmission history beside the demographics when there is one', async () => {
    await renderPatient();

    expect(screen.getByRole('heading', { name: 'Readmission history' })).toBeInTheDocument();
    const grid = screen.getByRole('heading', { name: 'Demographics' }).closest('div.grid');
    expect(twoColumns(grid)).toBe(true);
  });

  it('lets the demographics take the full row when there is no readmission history', async () => {
    pageState.apiFetch.mockImplementation(async (path: string) =>
      path === '/patients/1/admissions/readmissions'
        ? { patient_id: 1, total_admissions: 1, readmitted_total: 0, by_label: {} }
        : respond(path),
    );
    await renderPatient();

    expect(screen.queryByRole('heading', { name: 'Readmission history' })).not.toBeInTheDocument();
    const grid = screen.getByRole('heading', { name: 'Demographics' }).closest('div.grid');
    expect(grid).not.toBeNull();
    expect(twoColumns(grid)).toBe(false);
  });
});
