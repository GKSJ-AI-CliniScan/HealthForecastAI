'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/types';

interface NavItem {
  href: string;
  label: string;
  /** Permission required to see this item. Undefined means every role sees it. */
  permission?: string;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/model-training', label: 'Model Performance', permission: 'model:manage' },
  { href: '/patients', label: 'Patients', permission: 'patient:read_assigned' },
  { href: '/risk', label: 'Risk', permission: 'risk_report:read' },
  { href: '/analytics', label: 'Analytics', permission: 'hospital_analytics:read' },
  { href: '/treatment', label: 'Treatment', permission: 'treatment_report:read' },
  { href: '/research', label: 'Research', permission: 'population_health:read' },
  { href: '/users', label: 'Users', permission: 'user:manage' },
];

const ROLE_NAV: Record<string, string[]> = {
  doctor: ['/dashboard', '/patients', '/risk', '/treatment'],
  hospital_admin: ['/dashboard', '/patients', '/risk', '/analytics', '/treatment'],
  researcher: ['/dashboard', '/analytics', '/treatment', '/research'],
  system_admin: NAV.map((item) => item.href),
};

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const { user, token, loading, logout, can, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowedPaths = useMemo(
    () => (user ? ROLE_NAV[user.role] ?? ['/dashboard'] : ['/dashboard']),
    [user],
  );

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [token, loading, router]);

  useEffect(() => {
    const allowed = allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (!loading && user && !allowed) router.replace('/dashboard');
  }, [allowedPaths, loading, pathname, router, user]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="muted text-sm">Loading…</p>
      </main>
    );
  }

  if (!user) return null;

  // The doctor role holds patient:read_assigned; the admin roles hold
  // patient:read_all. Either one should surface the Patients tab.
  const visible = NAV.filter((item) => {
    if (!allowedPaths.includes(item.href)) return false;
    if (!item.permission) return true;
    if (item.permission === 'patient:read_assigned') {
      return user.role === 'doctor' || user.role === 'hospital_admin' || can('patient:read_assigned') || can('patient:read_all');
    }
    if (item.permission === 'treatment_report:read') {
      return can('treatment_report:read') || can('treatment_report:read_limited');
    }
    if (item.permission === 'hospital_analytics:read') {
      return can('hospital_analytics:read');
    }
    return can(item.permission);
  });

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">HF</span>
            <span>HealthForecast <span className="text-blue-600">AI</span></span>
          </Link>

          <nav aria-label="Primary navigation" className="flex max-w-full flex-wrap gap-1 overflow-x-auto">
            {visible.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                  style={{
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.full_name}</p>
              <p className="muted text-xs leading-tight">
                {ROLE_LABELS[user.role]}
                {user.department ? ` · ${user.department}` : ''}
              </p>
            </div>
            <span className="hidden rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex" style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
              {user.role.replace('_', ' ')}
            </span>
            <button type="button" className="btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {pathname !== '/dashboard' && (
          <div className="mb-6 flex items-center gap-2 text-xs" aria-label="Breadcrumb">
            <Link href="/dashboard" className="font-semibold text-[var(--accent)] hover:underline">
              Workspace home
            </Link>
            <span className="muted" aria-hidden="true">/</span>
            <span className="muted">
              {visible.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? 'Workspace'}
            </span>
          </div>
        )}
        {children}
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-10">
        <p className="muted text-xs">
          {permissions.length} permission{permissions.length === 1 ? '' : 's'} granted to this
          role. Every patient record access is written to the audit log.
        </p>
      </footer>
    </div>
  );
}
