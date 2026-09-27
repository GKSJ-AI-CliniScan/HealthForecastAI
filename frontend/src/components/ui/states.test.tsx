import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Loaded } from '@/lib/errors';

import { LoadedCard, NoAccess, PageLoading, SectionError } from './states';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const failed = (kind: 'failed' | 'forbidden' | 'cohort_too_small'): Loaded<number[]> => ({
  ok: false,
  error: { kind, status: kind === 'failed' ? 500 : 403, message: `problem: ${kind}` },
});

describe('LoadedCard', () => {
  it('renders the data', () => {
    render(
      <LoadedCard title="Numbers" result={{ ok: true, data: [1, 2] }}>
        {(data) => <p>{data.length} numbers</p>}
      </LoadedCard>,
    );
    expect(screen.getByRole('heading', { name: 'Numbers' })).toBeInTheDocument();
    expect(screen.getByText('2 numbers')).toBeInTheDocument();
  });

  it('renders the empty state instead of an empty chart', () => {
    render(
      <LoadedCard
        title="Numbers"
        result={{ ok: true, data: [] }}
        isEmpty={(data) => data.length === 0}
        empty="Nothing recorded yet."
      >
        {() => <p>chart</p>}
      </LoadedCard>,
    );
    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument();
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
  });

  it('renders the error and never the body', () => {
    render(
      <LoadedCard title="Numbers" result={failed('failed')}>
        {() => <p>chart</p>}
      </LoadedCard>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('problem: failed');
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
  });
});

describe('SectionError', () => {
  it('offers a retry for a transient failure', () => {
    render(<SectionError error={{ kind: 'failed', status: 503, message: 'down' }} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it.each(['forbidden', 'cohort_too_small', 'invalid', 'not_found'] as const)(
    'does not offer a retry that cannot help (%s)',
    (kind) => {
      render(<SectionError error={{ kind, status: 403, message: 'no' }} />);
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    },
  );
});

describe('NoAccess / PageLoading', () => {
  it('names what the role cannot see', () => {
    render(<NoAccess what="reports" />);
    expect(screen.getByRole('alert')).toHaveTextContent('does not have access to reports');
  });

  it('announces loading', () => {
    render(<PageLoading title="analytics" />);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.getByText('Loading analytics…')).toBeInTheDocument();
  });
});
