import Link from 'next/link';
import type { ReactNode } from 'react';

import BrandMark from '@/components/layout/BrandMark';
import { MenuIcon } from '@/components/layout/icons';
import NavLinks, { type NavGroup } from '@/components/layout/NavLinks';
import SignOutButton from '@/components/layout/SignOutButton';
import ThemeToggle from '@/components/layout/ThemeToggle';
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
 * again on its own. The permitted links are only sorted into groups here (Users
 * under Administration); none is added or removed, and empty groups are hidden.
 *
 * Desktop: a light sidebar. Small screens: a top bar with a native <details>
 * menu holding the same links (no client-side menu state).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const records = dashboardLinks(user);
  const groups: NavGroup[] = [
    { label: 'Records', links: records.filter((link) => link.href !== '/dashboard/users') },
    { label: 'Insights', links: insightLinks(user) },
    { label: 'Administration', links: records.filter((link) => link.href === '/dashboard/users') },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-rule bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex h-[4.5rem] shrink-0 items-center px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 pt-3">
          <NavLinks groups={groups} label="Main navigation" />
        </div>
        <div className="border-t border-rule p-4">
          <UserBlock user={user} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="relative z-30 flex h-16 items-center justify-between gap-4 border-b border-rule bg-surface px-4 sm:px-6 lg:hidden">
          <Brand />
          <details className="group">
            <summary className="btn btn-secondary btn-sm min-h-11 cursor-pointer list-none group-open:border-brand group-open:bg-brand-tint group-open:text-brand [&::-webkit-details-marker]:hidden">
              <MenuIcon className="h-[18px] w-[18px]" />
              Menu
            </summary>
            <div className="absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] space-y-6 overflow-y-auto border-b border-rule bg-surface px-3 pb-5 pt-4 shadow-lg sm:px-5">
              <NavLinks groups={groups} label="Main navigation" />
              <div className="border-t border-rule px-1 pt-4">
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
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg">
      <BrandMark />
      <span className="text-[1.0625rem] font-bold leading-none tracking-[-0.012em] text-ink">
        HealthForecast AI
      </span>
    </Link>
  );
}

/** Up to two initials for the profile disc - display only. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

function UserBlock({ user }: { user: SessionUser }) {
  const name = user.profile?.full_name ?? user.subject;
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-tint text-[0.8125rem] font-bold text-brand"
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-5 text-ink">{name}</p>
          <p className="truncate text-sm leading-5 text-ink-muted">{roleLabel(user.role)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ThemeToggle className="w-full" />
        <SignOutButton />
      </div>
    </div>
  );
}
