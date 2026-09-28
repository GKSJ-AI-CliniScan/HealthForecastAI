'use client';

import { type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
  enabled: boolean;
  requiredPermission?: string;
  hiddenForRoles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', enabled: true },
  { href: '/dashboard/risk', label: 'Risk Prediction', enabled: true, requiredPermission: 'risk_report:read' },
  { href: '/dashboard/treatment', label: 'Treatment Effectiveness', enabled: true, requiredPermission: 'treatment_report:read' },
  { href: '/dashboard/clinical-support', label: 'Clinical Decision Support', enabled: true, requiredPermission: 'care_recommendation:generate' },
  { href: '/dashboard/analytics', label: 'Healthcare Analytics', enabled: true, requiredPermission: 'hospital_analytics:read' },
  { href: '/dashboard/research', label: 'Research Cohort', enabled: true, requiredPermission: 'patient:read_anonymized' },
  { href: '/dashboard/user', label: 'User Management', enabled: true, requiredPermission: 'user:manage' },
  { href: '/dashboard/registry', label: 'Patients Registry', enabled: true, hiddenForRoles: ['researcher'] },
  { href: '/dashboard/reports', label: 'Reports', enabled: true, requiredPermission: 'analytics:export' },
];

function navItemClass(active: boolean): string {
  const base = 'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition';
  if (active) return base + ' bg-white/10 font-medium text-white';
  return base + ' text-slate-300 hover:bg-white/5 hover:text-white';
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { token, role, permissions, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.requiredPermission && !permissions.includes(item.requiredPermission)) return false;
    if (item.hiddenForRoles?.includes(role ?? '')) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-[var(--border)] bg-slate-950 text-slate-300">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">HealthForecast AI</p>
          <p className="mt-0.5 text-sm font-semibold text-white">Clinical Workspace</p>
          <span className="mt-2 inline-block rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300">
            {role?.replace('_', ' ')}
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {visibleItems.map((item) => {
            const active = pathname === item.href;
            return (
              <a key={item.label} href={item.href} className={navItemClass(active)}>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-slate-500">Signed in as</p>
          <p className="truncate text-sm font-medium capitalize text-white">{role?.replace('_', ' ')}</p>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="mt-3 text-xs text-slate-400 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-[var(--background)]">{children}</main>
    </div>
  );
}