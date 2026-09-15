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

  if (holds('risk_report:read')) {
    links.push({ href: '/dashboard/risk', label: 'Risk' });
  }

  // Reporting admits any role the access matrix grants some form of risk
  // reporting - the researcher included, who receives aggregated figures.
  if (holds('risk_report:read') || holds('risk_report:read_aggregated')) {
    links.push({ href: '/dashboard/reports', label: 'Reports' });
  }

  return links;
}

/**
 * Return true when `href` is the section the current path belongs to.
 *
 * Nested routes count as their section, so /dashboard/patients/12 keeps
 * "Patients" highlighted. /dashboard itself has to match exactly, or it would
 * light up on every page beneath it.
 *
 * Kept pure and exported so it can be tested without rendering a component.
 */
export function isActiveRoute(pathname: string | null, href: string): boolean {
  if (!pathname) {
    return false;
  }
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
