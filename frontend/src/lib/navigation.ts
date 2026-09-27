import type { SessionUser } from './session';

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Build the dashboard navigation for a role.
 *
 * Kept as a pure function so the "a role only renders what it is allowed to see"
 * rule from docs/07-testing can be tested directly, without rendering an async
 * server component.
 *
 * This is presentation only. Every route it returns is authorised again by the
 * backend, because a hidden menu item is not access control.
 */
export function dashboardLinks(user: Pick<SessionUser, 'permissions'>): NavLink[] {
  const holds = (permission: string) => user.permissions.includes(permission);

  const links: NavLink[] = [{ href: '/dashboard', label: 'Overview' }];

  if (
    holds('patient:read_assigned') ||
    holds('patient:read_all') ||
    holds('patient:read_anonymized')
  ) {
    links.push({ href: '/dashboard/patients', label: 'Patients' });
  }

  if (holds('user:manage')) {
    links.push({ href: '/dashboard/users', label: 'Users' });
  }

  return links;
}

/**
 * Analytics, research and reporting navigation - a second group beside the
 * records navigation above.
 *
 * Each link needs the same permission the backend demands for the data behind
 * it, so a role is never offered a section that can only answer 403. Doctors
 * reach Treatment (their TREATMENT_REPORT_READ_LIMITED scope) but not
 * Analytics or Reports: the backend grants them neither
 * HOSPITAL_ANALYTICS_READ nor ANALYTICS_EXPORT.
 */
export function insightLinks(user: Pick<SessionUser, 'permissions'>): NavLink[] {
  const holds = (permission: string) => user.permissions.includes(permission);
  const links: NavLink[] = [];

  if (holds('hospital_analytics:read') || holds('population_health:read')) {
    links.push({ href: '/dashboard/analytics', label: 'Analytics' });
  }

  if (holds('treatment_report:read') || holds('treatment_report:read_limited')) {
    links.push({ href: '/dashboard/treatment', label: 'Treatment' });
  }

  if (holds('patient:read_anonymized') || holds('research_dataset:export')) {
    links.push({ href: '/dashboard/research', label: 'Research' });
  }

  if (holds('analytics:export')) {
    links.push({ href: '/dashboard/reports', label: 'Reports' });
  }

  return links;
}

/** Tabs inside the Analytics section, filtered the same way. */
export function analyticsTabs(user: Pick<SessionUser, 'permissions'>): NavLink[] {
  const holds = (permission: string) => user.permissions.includes(permission);
  const tabs: NavLink[] = [];

  if (holds('hospital_analytics:read')) {
    tabs.push(
      { href: '/dashboard/analytics/readmissions', label: 'Readmissions' },
      { href: '/dashboard/analytics/outcomes', label: 'Patient outcomes' },
      { href: '/dashboard/analytics/risk', label: 'Risk distribution' },
      { href: '/dashboard/analytics/departments', label: 'Departments' },
    );
  }

  if (holds('population_health:read')) {
    tabs.push({ href: '/dashboard/analytics/population', label: 'Population health' });
  }

  return tabs;
}
