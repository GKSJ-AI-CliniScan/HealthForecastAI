'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
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
  { href: '/patients', label: 'Patients', permission: 'patient:read_assigned' },
  { href: '/risk', label: 'Risk', permission: 'risk_report:read' },
  { href: '/analytics', label: 'Analytics', permission: 'hospital_analytics:read' },
  { href: '/research', label: 'Research', permission: 'population_health:read' },
  { href: '/users', label: 'Users', permission: 'user:manage' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, token, loading, logout, can, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [token, loading, router]);

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
    if (!item.permission) return true;
    if (item.permission === 'patient:read_assigned') {
      return can('patient:read_assigned') || can('patient:read_all');
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
          <Link href="/dashboard" className="font-semibold tracking-tight">
            HealthForecast AI
          </Link>

          <nav className="flex flex-wrap gap-1">
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
            <button type="button" className="btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      <footer className="mx-auto max-w-7xl px-6 pb-10">
        <p className="muted text-xs">
          {permissions.length} permission{permissions.length === 1 ? '' : 's'} granted to this
          role. Every patient record access is written to the audit log.
        </p>
      </footer>
    </div>
  );
}
