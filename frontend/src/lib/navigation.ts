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
