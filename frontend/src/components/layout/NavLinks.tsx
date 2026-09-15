'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavLink } from '@/lib/navigation';
import { isActiveRoute } from '@/lib/navigation';

/**
 * Dashboard navigation with a current-route indicator.
 *
 * A client component only because the active state needs the pathname. The link
 * list itself is still decided on the server by dashboardLinks, so which
 * sections a role can see is never a client-side decision.
 */
export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard sections" className="flex flex-wrap gap-1 text-sm">
      {links.map((link) => {
        const active = isActiveRoute(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-md bg-[var(--background)] px-2.5 py-1 font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]'
                : 'rounded-md px-2.5 py-1 opacity-70 transition-opacity hover:opacity-100'
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
