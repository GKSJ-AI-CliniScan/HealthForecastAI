// FILE: src/components/layout/AppShell.tsx

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import {
  Activity,
  BarChart3,
  BrainCircuit,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Microscope,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';

import { useAuth } from '@/lib/auth-context';
import { P } from '@/lib/permissions';
import { formatRole } from '@/components/ui';

interface Item {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  any?: string[];
}

const items: Item[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
  },

  {
    href: '/dashboard/registry',
    label: 'Patient Registry',
    icon: Users,
    any: [P.patientAssigned, P.patientAll],
  },

  {
    href: '/dashboard/risk',
    label: 'Risk & Forecast',
    icon: HeartPulse,
    any: [P.risk, P.riskAggregated],
  },

  {
    href: '/dashboard/treatment',
    label: 'Treatment Effectiveness',
    icon: Activity,
    any: [P.treatment, P.treatmentLimited],
  },

  {
    href: '/dashboard/clinical-support',
    label: 'Clinical Support',
    icon: Stethoscope,
    any: [P.cds],
  },

  {
    href: '/dashboard/analytics',
    label: 'Healthcare Analytics',
    icon: BarChart3,
    any: [P.analytics],
  },

  {
    href: '/dashboard/research',
    label: 'Research Cohort',
    icon: Microscope,
    any: [P.patientAnon],
  },

  {
    href: '/dashboard/reports',
    label: 'Reports & Exports',
    icon: FileText,
    any: [P.export, P.researchExport],
  },

  {
    href: '/dashboard/models',
    label: 'Model Management',
    icon: BrainCircuit,
    any: [P.models],
  },

  {
    href: '/dashboard/user',
    label: 'User Management',
    icon: ShieldCheck,
    any: [P.users],
  },
];

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const {
    token,
    role,
    permissions,
    isLoading,
    logout,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-clinical-600" />
      </div>
    );
  }

  const visible = items.filter(
    (item) =>
      !item.any ||
      item.any.some((permission) =>
        permissions.includes(permission),
      ),
  );

  const requiredByRoute: [string, string[]][] = [
    [
      '/dashboard/registry',
      [P.patientAssigned, P.patientAll],
    ],
    [
      '/dashboard/risk',
      [P.risk, P.riskAggregated],
    ],
    [
      '/dashboard/treatment',
      [P.treatment, P.treatmentLimited],
    ],
    [
      '/dashboard/clinical-support',
      [P.cds],
    ],
    ['/dashboard/analytics', [P.analytics]],
    ['/dashboard/research', [P.patientAnon]],
    [
      '/dashboard/reports',
      [P.export, P.researchExport],
    ],
    ['/dashboard/models', [P.models]],
    ['/dashboard/user', [P.users]],
  ];

  const matched = requiredByRoute.find(
    ([path]) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  );

  const hasRouteAccess =
    !matched ||
    matched[1].some((permission) =>
      permissions.includes(permission),
    );

  const renderNav = () => (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
          <HeartPulse className="h-5 w-5" />
        </div>

        <div>
          <div className="text-sm font-bold text-navy-950">
            HealthForecast AI
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[.15em] text-clinical-600">
            Clinical console
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
          Care workspace
        </p>

        <nav className="space-y-1">
          {visible
            .filter((item) =>
              [
                '/dashboard',
                '/dashboard/registry',
                '/dashboard/risk',
                '/dashboard/treatment',
                '/dashboard/clinical-support',
              ].includes(item.href),
            )
            .map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-cyan-50 text-clinical-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {visible.some((item) =>
          [
            '/dashboard/analytics',
            '/dashboard/research',
            '/dashboard/reports',
            '/dashboard/models',
            '/dashboard/user',
          ].includes(item.href),
        ) && (
          <>
            <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
              Insights & administration
            </p>

            <nav className="space-y-1">
              {visible
                .filter((item) =>
                  [
                    '/dashboard/analytics',
                    '/dashboard/research',
                    '/dashboard/reports',
                    '/dashboard/models',
                    '/dashboard/user',
                  ].includes(item.href),
                )
                .map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(
                      `${item.href}/`,
                    );

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? 'bg-cyan-50 text-clinical-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  );
                })}
            </nav>
          </>
        )}
      </div>

      <div className="mt-auto border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
              {formatRole(role)
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-navy-950">
                {formatRole(role)}
              </p>

              <p className="text-[11px] text-slate-500">
                Access scoped by role
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white hover:text-red-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  if (!hasRouteAccess) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-5">
          <span className="text-sm font-bold text-navy-950">
            HealthForecast AI
          </span>
        </header>

        <main className="mx-auto max-w-xl px-5 py-16">
          <div className="surface p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-clinical-600" />

            <h1 className="mt-4 text-xl font-bold text-navy-950">
              Access not available
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This workspace is outside the permissions
              assigned to your account.
            </p>

            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary mt-6"
            >
              Return to overview
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-slate-200 bg-white lg:flex">
        {renderNav()}
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-7">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="lg:hidden">
              <span className="text-sm font-bold text-navy-950">
                HealthForecast AI
              </span>
            </div>

            <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Clinical workspace
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 sm:inline-flex">
              {formatRole(role)}
            </span>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-clinical-700">
              HF
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/30"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-2xl">
            {renderNav()}

            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}