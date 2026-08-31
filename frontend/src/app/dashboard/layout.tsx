import Link from 'next/link';
import type { ReactNode } from 'react';

import SignOutButton from '@/components/layout/SignOutButton';
import { Badge } from '@/components/ui';
import { dashboardLinks } from '@/lib/navigation';
import { requireUser } from '@/lib/session';

const ROLE_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  hospital_admin: 'Hospital Administrator',
  researcher: 'Healthcare Researcher',
  system_admin: 'System Administrator',
};

/**
 * Dashboard shell.
 *
 * Navigation is built from the permission list the backend returned, so the four
 * roles each see only the sections they hold a permission for. This is a
 * convenience, not a control: every link leads to a route the server authorises
 * again on its own.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const links = dashboardLinks(user);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/dashboard" className="font-semibold">
            HealthForecast AI
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="opacity-80 hover:opacity-100">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="opacity-70">{user.profile?.full_name ?? user.subject}</span>
            <Badge>{ROLE_LABELS[user.role] ?? user.role}</Badge>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
