export type ValueFormat = 'number' | 'percent' | 'decimal';

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

export type ChartRow = Record<string, string | number | null>;

/** Colour-blind-friendly palette shared by every chart. */
export const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#64748b'];

/** Fixed colours for categories that mean the same thing on every chart. */
export const SEMANTIC_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
  improved: '#22c55e',
  unchanged: '#94a3b8',
  worsened: '#ef4444',
  unknown: '#a855f7',
  unrecorded: '#cbd5e1',
};

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
