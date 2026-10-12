import Link from 'next/link';
import type { ReactNode } from 'react';

import BrandMark from '@/components/layout/BrandMark';
import NavLinks, { type NavGroup } from '@/components/layout/NavLinks';
import SignOutButton from '@/components/layout/SignOutButton';
import { ExperimentalNotice } from '@/components/ui/ModelDisclaimer';
import { roleLabel } from '@/components/ui/labels';
import { dashboardLinks, insightLinks } from '@/lib/navigation';
import { requireUser, type SessionUser } from '@/lib/session';

/**
 * Dashboard shell.
 *
 * Navigation is built from the permission list the backend returned, so the four
 * roles each see only the sections they hold a permission for. This is a
 * convenience, not a control: every link leads to a route the server authorises
 * again on its own.
 *
 * Desktop: a sidebar with the two link groups. Small screens: a top bar with a
 * native <details> menu holding the same links (no client-side menu state).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const groups: NavGroup[] = [
    { label: 'Records', links: dashboardLinks(user) },
    { label: 'Insights', links: insightLinks(user) },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-rule bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 pb-6 pt-6">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <NavLinks groups={groups} label="Main navigation" />
        </div>
        <div className="border-t border-rule p-4">
          <UserBlock user={user} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="relative z-30 flex items-center justify-between gap-4 border-b border-rule bg-surface px-4 py-3 sm:px-6 lg:hidden">
          <Brand />
          <details className="group">
            <summary className="btn btn-secondary btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none">
                <path
                  d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Menu
            </summary>
            <div className="absolute inset-x-0 top-full space-y-5 border-b border-rule bg-surface px-4 pb-5 pt-4 shadow-lg sm:px-6">
              <NavLinks groups={groups} label="Main navigation" />
              <div className="border-t border-rule pt-4">
                <UserBlock user={user} />
              </div>
            </div>
          </details>
        </header>

        <main className="mx-auto w-full max-w-content px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <ExperimentalNotice className="mb-7" />
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md">
      <BrandMark />
      <span className="text-[1.0625rem] font-bold leading-tight text-ink">HealthForecast AI</span>
    </Link>
  );
}

function UserBlock({ user }: { user: SessionUser }) {
  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <p className="truncate font-bold text-ink">{user.profile?.full_name ?? user.subject}</p>
        <p className="text-sm text-ink-muted">{roleLabel(user.role)}</p>
      </div>
      <SignOutButton />
    </div>
  );
}
