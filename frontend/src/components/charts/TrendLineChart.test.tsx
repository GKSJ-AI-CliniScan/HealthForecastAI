import { render, screen } from '@testing-library/react';
import { cloneElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import TrendLineChart from './TrendLineChart';

// jsdom has no layout: give ResponsiveContainer a fixed size so the chart draws.
vi.mock('recharts', async (original) => {
  const actual = await original<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 600, height: 280 }),
  };
});

const ROWS = [
  { at: Date.UTC(2026, 9, 8, 17, 0), risk: 0.78, forecast: 0.59 },
  { at: Date.UTC(2026, 9, 9, 17, 0), risk: 0.61, forecast: 0.68 },
];
const SERIES = [
  { key: 'risk', label: 'Risk score (experimental)' },
  { key: 'forecast', label: '30-day readmission score (experimental)' },
];

describe('TrendLineChart zones', () => {
  it('shades three bands and draws the two fixed cut-offs for score charts', () => {
    const { container } = render(
      <TrendLineChart label="Scores" data={ROWS} xKey="at" xType="time" series={SERIES} valueFormat="decimal" zones />,
    );
    expect(container.querySelectorAll('.recharts-reference-area').length).toBe(3);
    expect(container.querySelectorAll('.recharts-reference-line').length).toBe(2);
    // Recharts 3 renders tick labels in their own layer, outside the axis group.
    const yTicks = [...container.querySelectorAll('.recharts-yAxis-tick-labels text')].map(
      (tick) => tick.textContent,
    );
    expect(yTicks).toEqual(['0', '0.4', '0.7', '1']);
  });

  it('adds no zones to other charts', () => {
    const { container } = render(
      <TrendLineChart label="Recovery" data={ROWS} xKey="at" xType="time" series={SERIES} valueFormat="decimal" />,
    );
    expect(container.querySelectorAll('.recharts-reference-area').length).toBe(0);
    expect(container.querySelectorAll('.recharts-reference-line').length).toBe(0);
  });

  it('keeps the series names and the accessible chart name', () => {
    render(
      <TrendLineChart label="Scores" data={ROWS} xKey="at" xType="time" series={SERIES} valueFormat="decimal" zones />,
    );
    expect(screen.getByRole('img', { name: 'Scores' })).toBeInTheDocument();
    expect(screen.getByText('Risk score (experimental)')).toBeInTheDocument();
    expect(screen.getByText('30-day readmission score (experimental)')).toBeInTheDocument();
  });
});
