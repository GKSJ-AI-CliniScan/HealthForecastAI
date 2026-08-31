import { describe, expect, it } from 'vitest';

import { dashboardLinks } from './navigation';

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
