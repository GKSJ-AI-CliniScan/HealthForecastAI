import { render, screen } from '@testing-library/react';
import { cloneElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ForecastChart from './ForecastChart';

// jsdom has no layout, so recharts' ResponsiveContainer measures 0x0 and draws
// nothing. Give the chart a fixed size so its axis labels are rendered.
vi.mock('recharts', async (original) => {
  const actual = await original<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 480, height: 180 }),
  };
});

describe('ForecastChart', () => {
  it('labels the two bars by the fixed 0.50 threshold', () => {
    render(<ForecastChart predicted={3} total={10} />);

    expect(screen.getByText('At or above 0.50')).toBeInTheDocument();
    expect(screen.getByText('Below 0.50')).toBeInTheDocument();
  });

  it('no longer uses the ambiguous "Predicted readmission" / "Not predicted" labels', () => {
    render(<ForecastChart predicted={3} total={10} />);

    expect(screen.queryByText('Predicted readmission')).not.toBeInTheDocument();
    expect(screen.queryByText('Not predicted')).not.toBeInTheDocument();
  });

  it('still draws one bar per category', () => {
    const { container } = render(<ForecastChart predicted={3} total={10} />);

    expect(container.querySelectorAll('.recharts-bar-rectangle').length).toBe(2);
  });
});
