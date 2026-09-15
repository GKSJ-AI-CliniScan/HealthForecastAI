import { describe, expect, it } from 'vitest';

import { dashboardLinks, isActiveRoute } from './navigation';

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

  it('shows patients, risk and reports to a doctor', () => {
    // DOCTOR holds risk_report:read, so Risk and Reports are both theirs.
    expect(labels(DOCTOR)).toEqual(['Overview', 'Patients', 'Risk', 'Reports']);
  });

  it('gives a researcher reports but not the identifiable risk cohort', () => {
    // The access matrix grants them risk_report:read_aggregated only.
    const RESEARCHER_WITH_REPORTS = [...RESEARCHER, 'risk_report:read_aggregated'];
    expect(labels(RESEARCHER_WITH_REPORTS)).toContain('Reports');
    expect(labels(RESEARCHER_WITH_REPORTS)).not.toContain('Risk');
  });

  it('hides risk from a role without risk_report:read', () => {
    expect(labels(HOSPITAL_ADMIN)).not.toContain('Risk');
    expect(labels(RESEARCHER)).not.toContain('Risk');
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

describe('isActiveRoute', () => {
  it('matches the overview only exactly', () => {
    expect(isActiveRoute('/dashboard', '/dashboard')).toBe(true);
    // Without an exact match the overview would highlight on every child route.
    expect(isActiveRoute('/dashboard/patients', '/dashboard')).toBe(false);
  });

  it('keeps a section active on its nested routes', () => {
    expect(isActiveRoute('/dashboard/patients/12', '/dashboard/patients')).toBe(true);
    expect(isActiveRoute('/dashboard/reports/7', '/dashboard/reports')).toBe(true);
  });

  it('does not match a different section with a shared prefix', () => {
    expect(isActiveRoute('/dashboard/reports-archive', '/dashboard/reports')).toBe(false);
  });

  it('is inactive when the pathname is unknown', () => {
    expect(isActiveRoute(null, '/dashboard')).toBe(false);
  });
});
