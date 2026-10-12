/**
 * Display-only wording for values the API returns in machine form.
 *
 * Nothing here changes a value used for sorting, filtering or requests - each
 * helper takes the API value and returns text for the screen.
 */

export const ROLE_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  hospital_admin: 'Hospital Administrator',
  researcher: 'Healthcare Researcher',
  system_admin: 'System Administrator',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** "30_day" -> "30-day". Unknown values are shown with underscores as spaces. */
export function windowLabel(window: string | null | undefined): string {
  if (!window) {
    return '30-day';
  }
  return window.replace(/^(\d+)_day$/, '$1-day').replace(/_/g, ' ');
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A date as "4 Jan 2026".
 *
 * - A calendar date ("2026-01-04", an admission or discharge date) has no time
 *   zone, so it is formatted in UTC and always shows the same day. The screen
 *   used to print the raw "2026-01-04".
 * - A timestamp is shown on the day it falls on in ``timeZone``. Left unset
 *   that is the runtime's own zone, exactly as the screen's earlier
 *   ``toLocaleDateString()`` did (these pages render on the server, so it is
 *   the server's zone).
 */
export function formatDate(value: string | null | undefined, timeZone?: string): string {
  if (!value) {
    return '-';
  }
  const dateOnly = DATE_ONLY.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : timeZone,
  });
}

/**
 * A timestamp as "9 Oct 2026, 17:27 UTC". Like the screen's earlier
 * ``toLocaleString()`` it is shown in ``timeZone`` (unset: the runtime's own
 * zone), but the zone's name is now always printed so the time is unambiguous.
 */
export function formatTimestamp(value: string | null | undefined, timeZone?: string): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${part('timeZoneName')}`;
}

/**
 * Model versions are the training timestamp, written in UTC (+00:00). Shown as
 * a readable date in that same zone; the exact version string stays available
 * as a tooltip.
 */
export function modelVersionLabel(version: string): string {
  const date = new Date(version);
  return Number.isNaN(date.getTime()) ? version : `trained ${formatTimestamp(version, 'UTC')}`;
}

/**
 * The datasets' readmission codes ("<30", ">30", "NO") in words. Unknown codes
 * are shown as they are.
 */
const READMISSION_LABELS: Record<string, string> = {
  '<30': 'Within 30 days',
  '>30': 'After 30 days',
  NO: 'Not readmitted',
};

export function readmissionLabel(code: string | null | undefined): string {
  if (!code) {
    return '-';
  }
  return READMISSION_LABELS[code] ?? code;
}
