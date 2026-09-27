import type { SessionUser } from '@/lib/session';
import type { Role } from '@/types';

/**
 * The full permission set each role holds in backend/app/core/rbac.py
 * (PERMISSIONS), so tests exercise the real access matrix rather than a
 * hand-picked subset.
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  doctor: [
    'patient:read_assigned',
    'medical_history:read',
    'risk_report:read',
    'readmission_forecast:read',
    'treatment_report:read_limited',
    'care_recommendation:generate',
  ],
  hospital_admin: [
    'patient:read_all',
    'risk_report:read_aggregated',
    'readmission_forecast:read',
    'treatment_report:read',
    'hospital_analytics:read',
    'population_health:read',
    'analytics:export',
  ],
  researcher: [
    'patient:read_anonymized',
    'risk_report:read_aggregated',
    'treatment_report:read',
    'hospital_analytics:read',
    'population_health:read',
    'research_dataset:export',
    'analytics:export',
  ],
  system_admin: [
    'patient:read_assigned',
    'patient:read_all',
    'patient:read_anonymized',
    'patient:write',
    'medical_history:read',
    'risk_report:read',
    'risk_report:read_aggregated',
    'readmission_forecast:read',
    'treatment_report:read',
    'treatment_report:read_limited',
    'care_recommendation:generate',
    'hospital_analytics:read',
    'population_health:read',
    'research_dataset:export',
    'analytics:export',
    'user:manage',
    'model:manage',
    'audit_log:read',
    'system:configure',
  ],
};

export function sessionUser(role: Role, id = 7): SessionUser {
  return {
    subject: String(id),
    role,
    permissions: ROLE_PERMISSIONS[role],
    profile: {
      id,
      email: `${role}@hospital.org`,
      full_name: `${role} user`,
      role,
      department: null,
      is_active: true,
    },
  };
}
