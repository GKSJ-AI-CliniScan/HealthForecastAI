import { describe, expect, it } from 'vitest';

import { ROLE_PERMISSIONS } from '@/test-utils/permissions';

import { analyticsTabs, dashboardLinks, insightLinks } from './navigation';

/**
 * docs/07-testing: "test that a role only renders what it is allowed to see".
 *
 * The permission lists below are the ones app/core/rbac.py grants each role.
 */
const DOCTOR = ['patient:read_assigned', 'medical_history:read', 'risk_report:read'];
const HOSPITAL_ADMIN = ['patient:read_all', 'hospital_analytics:read'];
const RESEARCHER = ['patient:read_anonymized', 'population_health:read'];
const SYSTEM_ADMIN = ['patient:read_all', 'patient:write', 'user:manage', 'model:manage'];

const labels = (permissions: string[]) =>
  dashboardLinks({ permissions }).map((link) => link.label);

describe('dashboardLinks', () => {
  it('always offers the overview', () => {
    expect(labels([])).toEqual(['Overview']);
  });

  it('shows patients to a doctor', () => {
    expect(labels(DOCTOR)).toEqual(['Overview', 'Patients']);
  });

  it('shows patients to a hospital administrator', () => {
    expect(labels(HOSPITAL_ADMIN)).toEqual(['Overview', 'Patients']);
  });

  it('shows patients to a researcher, who reaches the anonymised cohort', () => {
    expect(labels(RESEARCHER)).toEqual(['Overview', 'Patients']);
  });

  it('shows user management only to a system administrator', () => {
    expect(labels(SYSTEM_ADMIN)).toContain('Users');
    for (const role of [DOCTOR, HOSPITAL_ADMIN, RESEARCHER]) {
      expect(labels(role)).not.toContain('Users');
    }
  });

  it('never links a section a role holds no permission for', () => {
    const hrefs = dashboardLinks({ permissions: DOCTOR }).map((link) => link.href);
    expect(hrefs).not.toContain('/dashboard/users');
  });
});

describe('insightLinks (full rbac.py permission sets)', () => {
  const insight = (role: keyof typeof ROLE_PERMISSIONS) =>
    insightLinks({ permissions: ROLE_PERMISSIONS[role] }).map((link) => link.label);

  it('gives a doctor treatment effectiveness only - no analytics, research or reports', () => {
    expect(insight('doctor')).toEqual(['Treatment']);
  });

  it('gives a hospital administrator analytics, treatment and reports but not research', () => {
    expect(insight('hospital_admin')).toEqual(['Analytics', 'Treatment', 'Reports']);
  });

  it('gives a researcher analytics, treatment, research and reports', () => {
    expect(insight('researcher')).toEqual(['Analytics', 'Treatment', 'Research', 'Reports']);
  });

  it('gives a system administrator every section', () => {
    expect(insight('system_admin')).toEqual(['Analytics', 'Treatment', 'Research', 'Reports']);
  });

  it('offers nothing without a permission', () => {
    expect(insightLinks({ permissions: [] })).toEqual([]);
  });
});

describe('analyticsTabs', () => {
  it('shows dashboard tabs and population health to a hospital administrator', () => {
    const tabs = analyticsTabs({ permissions: ROLE_PERMISSIONS.hospital_admin });
    expect(tabs.map((tab) => tab.label)).toEqual([
      'Readmissions',
      'Patient outcomes',
      'Risk distribution',
      'Departments',
      'Population health',
    ]);
  });

  it('shows only population health to a role holding just that permission', () => {
    const tabs = analyticsTabs({ permissions: ['population_health:read'] });
    expect(tabs.map((tab) => tab.href)).toEqual(['/dashboard/analytics/population']);
  });

  it('shows no tab to a doctor', () => {
    expect(analyticsTabs({ permissions: ROLE_PERMISSIONS.doctor })).toEqual([]);
  });
});
