import { describe, expect, it } from 'vitest';

import { formatTimeFull, formatTimeTick } from '@/components/charts/chartUtils';

import { assignedDoctorLabel } from './format';

describe('assignedDoctorLabel', () => {
  it('shows the doctor name rather than a raw id', () => {
    expect(assignedDoctorLabel({ assigned_doctor_id: 2, assigned_doctor_name: 'Dr Rao' }, 9)).toBe(
      'Dr Rao',
    );
  });

  it('marks the viewer as the assigned doctor', () => {
    expect(assignedDoctorLabel({ assigned_doctor_id: 2, assigned_doctor_name: 'Dr Rao' }, 2)).toBe(
      'Dr Rao (you)',
    );
  });

  it('never falls back to a bare numeric id', () => {
    const label = assignedDoctorLabel({ assigned_doctor_id: 2, assigned_doctor_name: null }, 9);
    expect(label).toBe('Assigned doctor');
    expect(label).not.toMatch(/\d/);
  });

  it('reports an unassigned patient', () => {
    expect(assignedDoctorLabel({ assigned_doctor_id: null }, 2)).toBe('Unassigned');
  });
});

describe('time axis labels', () => {
  const base = Date.UTC(2026, 9, 8, 17, 14, 5);

  it('keeps predictions made within the same minute distinguishable', () => {
    const end = base + 40_000;
    const first = formatTimeTick(base, base, end);
    const second = formatTimeTick(base + 30_000, base, end);
    expect(first).toBe('17:14:05');
    expect(second).toBe('17:14:35');
    expect(first).not.toBe(second);
  });

  it('adds the date when a short range crosses midnight', () => {
    const nextMorning = Date.UTC(2026, 9, 9, 7, 11, 25);
    expect(formatTimeTick(base, base, nextMorning)).toBe('8 Oct, 17:14');
    expect(formatTimeTick(nextMorning, base, nextMorning)).toBe('9 Oct, 07:11');
  });

  it('omits the date within a single day and the time for multi-month ranges', () => {
    expect(formatTimeTick(base, base - 3 * 3600_000, base)).toBe('17:14');
    expect(formatTimeTick(base, base - 90 * 24 * 3600_000, base)).toBe('8 Oct 2026');
  });

  it('gives the tooltip the full timestamp to the second', () => {
    expect(formatTimeFull(base)).toBe('8 Oct 2026, 17:14:05 UTC');
  });
});
