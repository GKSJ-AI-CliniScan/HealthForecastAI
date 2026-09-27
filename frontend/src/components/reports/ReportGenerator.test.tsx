import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { availableReportTypes } from '@/lib/reports';
import { ROLE_PERMISSIONS } from '@/test-utils/permissions';

import ReportGenerator, { buildFilters } from './ReportGenerator';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const options = availableReportTypes(ROLE_PERMISSIONS.researcher);

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

beforeEach(() => refresh.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe('buildFilters', () => {
  it('keeps only the allowed, filled-in filters and types months as a number', () => {
    expect(
      buildFilters(['months'], { months: '24', department: 'ICU' }),
    ).toEqual({ months: 24 });
    expect(buildFilters(['diagnosis', 'gender'], { diagnosis: '  Asthma ', gender: '' })).toEqual({
      diagnosis: 'Asthma',
    });
  });
});

describe('ReportGenerator', () => {
  it('offers only the report types it was given', () => {
    render(
      <ReportGenerator options={availableReportTypes(['analytics:export', 'hospital_analytics:read'])} />,
    );
    const typeSelect = screen.getByLabelText('Report type');
    const labels = Array.from((typeSelect as HTMLSelectElement).options).map((o) => o.text);
    expect(labels).toEqual([
      'Patient outcome analytics',
      'Department performance',
      'Risk distribution',
      'Readmission analytics',
    ]);
  });

  it('explains when the role cannot generate anything', () => {
    render(<ReportGenerator options={[]} />);
    expect(screen.getByText(/cannot generate any report type/i)).toBeInTheDocument();
  });

  it('shows the filters of the selected type only', () => {
    render(<ReportGenerator options={options} />);
    expect(screen.getByLabelText('Treatment name')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Report type'), {
      target: { value: 'population_health' },
    });
    expect(screen.queryByLabelText('Treatment name')).not.toBeInTheDocument();
    expect(screen.getByText(/has no filters/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'research_cohort' } });
    expect(screen.getByLabelText('Primary diagnosis')).toBeInTheDocument();
    expect(screen.getByLabelText('Admitted from')).toHaveAttribute('type', 'date');
  });

  it('posts the request to the proxy route and refreshes the history', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 9 }, 201));
    vi.stubGlobal('fetch', fetchMock);

    render(<ReportGenerator options={options} />);
    fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'risk_distribution' } });
    fireEvent.change(screen.getByLabelText('Export format'), { target: { value: 'xlsx' } });
    fireEvent.change(screen.getByLabelText('Months of history'), { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/reports');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      report_type: 'risk_distribution',
      format: 'xlsx',
      filters: { months: 24 },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/report generated/i);
  });

  it('explains a cohort-size refusal and does not refresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ detail: { error: 'cohort_too_small', minimum: 10, actual: 4 } }, 422),
      ),
    );
    render(<ReportGenerator options={options} />);
    fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'population_health' } });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 10 are required/i);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shows the backend validation message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ detail: [{ msg: 'Value error, date_from must be on or before date_to' }] }, 422),
      ),
    );
    render(<ReportGenerator options={options} />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'date_from must be on or before date_to',
    );
  });

  it('reports an unreachable server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<ReportGenerator options={options} />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
  });
});
