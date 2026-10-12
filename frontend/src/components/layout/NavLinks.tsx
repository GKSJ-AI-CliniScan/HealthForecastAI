'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import type { NavLink } from '@/lib/navigation';

export interface NavGroup {
  label: string;
  links: NavLink[];
}

/** True when ``href`` is the current page or a page beneath it. */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The dashboard's grouped navigation. The links themselves come from
 * lib/navigation (permission-filtered on the server); this only marks the
 * current one and, inside the mobile menu, closes the menu after navigating.
 */
export default function NavLinks({ groups, label }: { groups: NavGroup[]; label: string }) {
  const pathname = usePathname() ?? '';
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const menu = ref.current?.closest('details');
    if (menu) {
      menu.open = false;
    }
  }, [pathname]);

  return (
    <nav ref={ref} aria-label={label} className="space-y-6">
      {groups
        .filter((group) => group.links.length > 0)
        .map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[0.8125rem] font-semibold text-ink-muted">{group.label}</p>
            <ul className="space-y-0.5">
              {group.links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center rounded-md px-3 py-2 text-[0.9375rem] transition-colors ${
                        active
                          ? 'bg-brand-tint font-bold text-brand before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand'
                          : 'text-ink hover:bg-sunken'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </nav>
  );
}
