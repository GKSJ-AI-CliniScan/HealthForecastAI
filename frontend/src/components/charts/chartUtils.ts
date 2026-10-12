import type { CSSProperties } from 'react';

export type ValueFormat = 'number' | 'percent' | 'decimal';

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

export type ChartRow = Record<string, string | number | null>;

/**
 * Series palette, ordered for distinctness (and colour-blind separation):
 * biro blue, teal, umber, violet, slate, ochre-brown, plum. Mid-tones that hold
 * up on both the light and the dark surface. Red, amber and green are left out
 * on purpose - those colours mean LOW / MEDIUM / HIGH on every chart.
 */
export const PALETTE = ['#3D63B8', '#2B8C82', '#9A6B4A', '#7A5BB0', '#5D6E80', '#B07A1E', '#A0527A'];

/**
 * Fixed colours for categories that mean the same thing on every chart. Each
 * bar fill keeps at least 3:1 against the light and the dark surface.
 */
export const SEMANTIC_COLORS: Record<string, string> = {
  low: '#5A9E78',
  medium: '#B7832A',
  high: '#C0524C',
  improved: '#5A9E78',
  unchanged: '#6E7D8C',
  worsened: '#C0524C',
  unknown: '#7A5BB0',
  unrecorded: '#87939E',
};

/** Shared axis, grid, tooltip and legend styling; colours follow the theme. */
export const AXIS_TICK = { fontSize: 12, fill: 'currentColor' } as const;
export const GRID_PROPS = { stroke: 'currentColor', strokeOpacity: 0.14, strokeDasharray: '3 3' } as const;
export const TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--foreground)',
  fontSize: 13,
  boxShadow: '0 4px 14px rgb(0 0 0 / 0.08)',
};
export const TOOLTIP_LABEL_STYLE: CSSProperties = { color: 'var(--foreground)', fontWeight: 700 };
export const TOOLTIP_CURSOR = { fill: 'currentColor', fillOpacity: 0.06 } as const;
export const LEGEND_STYLE: CSSProperties = { fontSize: 13, paddingTop: 6 };

/** Classes for the <figure> around a chart: axis text uses the muted ink colour. */
export const FIGURE_CLASS = 'text-ink-muted';

export function seriesColor(series: ChartSeries, index: number): string {
  return series.color ?? SEMANTIC_COLORS[series.key] ?? PALETTE[index % PALETTE.length];
}

export function formatValue(value: unknown, format: ValueFormat): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === 'decimal') {
    return value.toFixed(2);
  }
  return value.toLocaleString('en-US');
}

const DAY_MS = 24 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Tick label for an epoch-ms time axis plotted between ``startMs`` and
 * ``endMs``. Precision follows the range: seconds for sub-hour ranges (so
 * same-minute points get distinct labels), the date whenever the range
 * crosses a UTC calendar day, and the year only for multi-month ranges.
 */
export function formatTimeTick(value: number, startMs: number, endMs: number): string {
  const span = endMs - startMs;
  const crossesDay =
    new Date(startMs).toISOString().slice(0, 10) !== new Date(endMs).toISOString().slice(0, 10);
  let options: Intl.DateTimeFormatOptions;
  if (span >= 60 * DAY_MS) {
    options = { day: 'numeric', month: 'short', year: 'numeric' };
  } else {
    options = { hour: '2-digit', minute: '2-digit', hour12: false };
    if (span < HOUR_MS) {
      options.second = '2-digit';
    }
    if (crossesDay) {
      options.day = 'numeric';
      options.month = 'short';
    }
  }
  return new Date(value).toLocaleString('en-GB', { ...options, timeZone: 'UTC' });
}

/** Full timestamp (to the second, UTC) for tooltips on a time axis. */
export function formatTimeFull(value: number): string {
  return `${new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'UTC',
  })} UTC`;
}

export function axisTick(format: ValueFormat): (value: number) => string {
  return (value: number) =>
    format === 'percent' ? `${Math.round(value * 100)}%` : value.toLocaleString('en-US');
}
