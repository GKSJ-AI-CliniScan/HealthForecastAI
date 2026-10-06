/**
 * nav.ts — which pages each role can open, and in what order the menu shows them.
 *
 * WHY: mirrors the access matrix in docs/04-rbac/README.md (backend/app/core/rbac.py
 * is the real guard — "a hidden menu item is not security"). Showing a doctor a
 * "Hospital report" button that always answers 403 would confuse a non-technical
 * user, so the menu only offers what the backend will actually allow.
 *
 * Pure data + functions, no React/'@' imports → tested by tests/nav.test.mjs.
 * FLOWS NEXT: AppShell builds the menu from pagesFor(); RequireRole blocks the rest;
 * the voice-command matcher uses the same list.
 */
import type { Role } from '../data/types';

export type PageId =
  | 'home'
  | 'patients'
  | 'risk'
  | 'forecast'
  | 'treatment'
  | 'care'
  | 'analytics'
  | 'research'
  | 'models'
  | 'users'
  | 'help';

export interface PageDef {
  id: PageId;
  href: string;
  /** i18n keys for the menu label and the one-line help under the page title */
  labelKey: `nav.${PageId}`;
  helpKey: `help.${PageId}`;
  /** Simple emoji icon: universally understood, needs no icon library, hidden from screen readers. */
  icon: string;
  roles: readonly Role[];
}

const ALL: readonly Role[] = ['doctor', 'hospital_admin', 'researcher', 'system_admin'];

export const PAGES: readonly PageDef[] = [
  { id: 'home', href: '/dashboard', labelKey: 'nav.home', helpKey: 'help.home', icon: '🏠', roles: ALL },
  // Patient records: doctor (assigned), admin (view), sysadmin. Researcher: anonymised only.
  { id: 'patients', href: '/patients', labelKey: 'nav.patients', helpKey: 'help.patients', icon: '🧑‍⚕️', roles: ['doctor', 'hospital_admin', 'system_admin'] },
  // risk_report:read — doctor + sysadmin (admin/researcher only have the aggregated variant).
  { id: 'risk', href: '/risk', labelKey: 'nav.risk', helpKey: 'help.risk', icon: '❤️', roles: ['doctor', 'system_admin'] },
  // readmission_forecast:read — everyone except researcher.
  { id: 'forecast', href: '/forecast', labelKey: 'nav.forecast', helpKey: 'help.forecast', icon: '📈', roles: ['doctor', 'hospital_admin', 'system_admin'] },
  // GET /treatment requires treatment_report:read → admin, researcher, sysadmin.
  // (Doctor only has treatment_report:read_limited and the backend has no "limited" endpoint yet → 403,
  // verified against the running backend. Add 'doctor' here once such an endpoint exists.)
  { id: 'treatment', href: '/treatment', labelKey: 'nav.treatment', helpKey: 'help.treatment', icon: '💊', roles: ['hospital_admin', 'researcher', 'system_admin'] },
  // care_recommendation:generate — doctor + sysadmin.
  { id: 'care', href: '/clinical-support', labelKey: 'nav.care', helpKey: 'help.care', icon: '🩺', roles: ['doctor', 'system_admin'] },
  // hospital_analytics:read — admin, researcher, sysadmin (NOT doctor).
  { id: 'analytics', href: '/analytics', labelKey: 'nav.analytics', helpKey: 'help.analytics', icon: '🏥', roles: ['hospital_admin', 'researcher', 'system_admin'] },
  // patient:read_anonymized + population_health:read — researcher + sysadmin.
  { id: 'research', href: '/research', labelKey: 'nav.research', helpKey: 'help.research', icon: '🔬', roles: ['researcher', 'system_admin'] },
  // model:manage, user:manage — sysadmin only.
  { id: 'models', href: '/models', labelKey: 'nav.models', helpKey: 'help.models', icon: '🤖', roles: ['system_admin'] },
  { id: 'users', href: '/users', labelKey: 'nav.users', helpKey: 'help.users', icon: '👥', roles: ['system_admin'] },
  { id: 'help', href: '/help', labelKey: 'nav.help', helpKey: 'help.help', icon: '♿', roles: ALL },
];

/** Menu for one role, in display order. */
export function pagesFor(role: Role): PageDef[] {
  return PAGES.filter((p) => p.roles.includes(role));
}

export function canOpen(role: Role, id: PageId): boolean {
  return PAGES.some((p) => p.id === id && p.roles.includes(role));
}

/** Which page a URL belongs to ('/patients/12' → 'patients'); used for titles and announcements. */
export function pageForPath(pathname: string): PageDef | undefined {
  return PAGES.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`));
}
