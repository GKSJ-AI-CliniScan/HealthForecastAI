import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatTimestamp,
  modelVersionLabel,
  readmissionLabel,
  roleLabel,
  windowLabel,
} from './labels';

describe('display labels', () => {
  it('names roles in words and leaves unknown roles as they are', () => {
    expect(roleLabel('system_admin')).toBe('System Administrator');
    expect(roleLabel('doctor')).toBe('Doctor');
    expect(roleLabel('auditor')).toBe('auditor');
  });

  it('writes the forecast window in words', () => {
    expect(windowLabel('30_day')).toBe('30-day');
    expect(windowLabel('90_day')).toBe('90-day');
    expect(windowLabel(null)).toBe('30-day');
  });

  it('formats a calendar date without shifting the day', () => {
    // Date-only values are treated as UTC, so no local zone can move them.
    expect(formatDate('2026-01-04')).toBe('4 Jan 2026');
    expect(formatDate(null)).toBe('-');
    expect(formatDate('not a date')).toBe('not a date');
  });

  it('never moves a calendar date, whatever zone the screen renders in', () => {
    for (const zone of ['Pacific/Auckland', 'America/Los_Angeles', 'Asia/Kolkata', 'UTC']) {
      expect(formatDate('2026-01-04', zone)).toBe('4 Jan 2026');
      expect(formatDate('2026-03-08', zone)).toBe('8 Mar 2026'); // a US daylight-saving change day
    }
  });

  it('puts a timestamp on the day it falls on in the zone used, as the screen always did', () => {
    // 23:30 UTC on 9 Oct is already 10 Oct in India and New Zealand, still 9 Oct in New York.
    expect(formatDate('2026-10-09T23:30:00+00:00', 'UTC')).toBe('9 Oct 2026');
    expect(formatDate('2026-10-09T23:30:00+00:00', 'America/New_York')).toBe('9 Oct 2026');
    expect(formatDate('2026-10-09T23:30:00+00:00', 'Asia/Kolkata')).toBe('10 Oct 2026');
    expect(formatDate('2026-10-09T23:30:00+00:00', 'Pacific/Auckland')).toBe('10 Oct 2026');
    // 00:30 UTC on 10 Oct is still 9 Oct in New York.
    expect(formatDate('2026-10-10T00:30:00+00:00', 'UTC')).toBe('10 Oct 2026');
    expect(formatDate('2026-10-10T00:30:00+00:00', 'America/New_York')).toBe('9 Oct 2026');
    // An offset in the value changes nothing: it is the same instant.
    expect(formatDate('2026-10-10T05:00:00+05:30', 'America/New_York')).toBe('9 Oct 2026');
  });

  it('uses the runtime time zone when none is given, like the earlier toLocaleDateString()', () => {
    for (const value of ['2026-10-09T23:30:00+00:00', '2026-10-10T00:30:00+00:00', '2026-01-04T12:00:00Z']) {
      const earlier = new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      expect(formatDate(value)).toBe(earlier);
    }
  });

  it('always states the time zone of a timestamp', () => {
    expect(formatTimestamp('2026-10-09T17:27:05.123+00:00', 'UTC')).toBe('9 Oct 2026, 17:27 UTC');
    expect(formatTimestamp('2026-10-09T23:30:00+05:30', 'UTC')).toBe('9 Oct 2026, 18:00 UTC');
    expect(formatTimestamp(undefined)).toBe('-');
  });

  it('shows a timestamp near midnight in the zone used, with that zone named', () => {
    expect(formatTimestamp('2026-10-09T23:30:00+00:00', 'UTC')).toBe('9 Oct 2026, 23:30 UTC');
    expect(formatTimestamp('2026-10-09T23:30:00+00:00', 'Asia/Kolkata')).toMatch(
      /^10 Oct 2026, 05:00 (GMT\+5:30|IST)$/,
    );
    expect(formatTimestamp('2026-10-09T23:30:00+00:00', 'America/New_York')).toMatch(
      /^9 Oct 2026, 19:30 (GMT-4|EDT)$/,
    );
    expect(formatTimestamp('2026-10-10T00:00:00+00:00', 'UTC')).toBe('10 Oct 2026, 00:00 UTC');
  });

  it('uses the runtime time zone when none is given, like the earlier toLocaleString()', () => {
    const value = '2026-10-09T23:30:00+00:00';
    const earlier = new Date(value).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const text = formatTimestamp(value);
    expect(text).toContain(`, ${earlier} `);
    expect(text).toMatch(/ \S+$/); // ends with a zone name
  });

  it('describes a timestamp model version, and passes other versions through', () => {
    expect(modelVersionLabel('2026-10-09T07:03:05.957385+00:00')).toBe('trained 9 Oct 2026, 07:03 UTC');
    // The version is a UTC timestamp, so it is always written in UTC.
    expect(modelVersionLabel('2026-10-09T23:59:00+00:00')).toBe('trained 9 Oct 2026, 23:59 UTC');
    expect(modelVersionLabel('v1')).toBe('v1');
  });

  it('spells out readmission codes and keeps unknown codes visible', () => {
    expect(readmissionLabel('<30')).toBe('Within 30 days');
    expect(readmissionLabel('>30')).toBe('After 30 days');
    expect(readmissionLabel('NO')).toBe('Not readmitted');
    expect(readmissionLabel('MAYBE')).toBe('MAYBE');
    expect(readmissionLabel(null)).toBe('-');
  });
});
