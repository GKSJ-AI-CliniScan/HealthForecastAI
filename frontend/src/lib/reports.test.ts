import { describe, expect, it } from 'vitest';

import { ROLE_PERMISSIONS } from '@/test-utils/permissions';

import { availableReportTypes, REPORT_TYPES, reportTypeLabel } from './reports';

const types = (permissions: string[]) => availableReportTypes(permissions).map((o) => o.type);

describe('availableReportTypes', () => {
  it('offers a doctor nothing, since the backend grants no analytics:export', () => {
    expect(types(ROLE_PERMISSIONS.doctor)).toEqual([]);
  });

  it('offers every report type to the roles that hold every data permission', () => {
    const all = REPORT_TYPES.map((option) => option.type);
    expect(types(ROLE_PERMISSIONS.hospital_admin)).toEqual(all);
    expect(types(ROLE_PERMISSIONS.researcher)).toEqual(all);
    expect(types(ROLE_PERMISSIONS.system_admin)).toEqual(all);
  });

  it('hides a type whose data permission is missing', () => {
    const offered = types(['analytics:export', 'hospital_analytics:read']);
    expect(offered).toContain('readmission_analytics');
    expect(offered).not.toContain('population_health');
    expect(offered).not.toContain('research_cohort');
    expect(offered).not.toContain('treatment_effectiveness');
  });

  it('accepts the limited treatment permission for treatment reports', () => {
    expect(types(['analytics:export', 'treatment_report:read_limited'])).toEqual([
      'treatment_effectiveness',
    ]);
  });
});

describe('report catalogue', () => {
  it('lists each of the seven backend report types exactly once', () => {
    const typesListed = REPORT_TYPES.map((option) => option.type);
    expect(new Set(typesListed).size).toBe(7);
  });

  it('only offers filters the backend accepts for that type', () => {
    const population = REPORT_TYPES.find((option) => option.type === 'population_health');
    expect(population?.filters).toEqual([]);
    const departments = REPORT_TYPES.find((option) => option.type === 'department_performance');
    expect(departments?.filters).toEqual(['date_from', 'date_to']);
  });

  it('labels report types for display', () => {
    expect(reportTypeLabel('risk_distribution')).toBe('Risk distribution');
  });
});
