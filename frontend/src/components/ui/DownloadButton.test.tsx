import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DownloadButton, { fileNameFrom } from './DownloadButton';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fileNameFrom', () => {
  it('reads a quoted file name', () => {
    expect(fileNameFrom('attachment; filename="report_1.pdf"', 'x')).toBe('report_1.pdf');
  });

  it('reads an RFC 5987 encoded file name', () => {
    expect(fileNameFrom("attachment; filename*=UTF-8''cohort%20a.csv", 'x')).toBe('cohort a.csv');
  });

  it('falls back when there is no header', () => {
    expect(fileNameFrom(null, 'fallback.csv')).toBe('fallback.csv');
  });
});

describe('DownloadButton', () => {
  it('saves the file under the server-provided name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('pseudo_id\n', {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="research_cohort.csv"' },
        }),
      ),
    );
    const createObjectURL = vi.fn().mockReturnValue('blob:1');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<DownloadButton href="/api/research/export" fallbackName="x.csv" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('research_cohort.csv');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:1');
  });

  it('shows the refusal instead of saving an error body as a file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ detail: { error: 'cohort_too_small', minimum: 10, actual: 3 } }),
          { status: 422 },
        ),
      ),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(<DownloadButton href="/api/research/export" label="Download CSV" fallbackName="x.csv" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/covers 3 records/);
    expect(click).not.toHaveBeenCalled();
  });

  it('explains a report whose file is gone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'The file for report 2 is no longer available' }), {
          status: 410,
        }),
      ),
    );
    render(<DownloadButton href="/api/reports/2/download" fallbackName="x.pdf" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer available');
  });
});
