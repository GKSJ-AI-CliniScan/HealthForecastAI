'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavLink } from '@/lib/navigation';

/** Horizontal tab strip; the tab matching the current path is marked current. */
export default function TabNav({ tabs, label }: { tabs: NavLink[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-rule px-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap border-b-[3px] px-3 py-2.5 text-[0.9375rem] transition-colors ${
              active
                ? 'border-brand font-bold text-brand'
                : 'border-transparent text-ink-muted hover:border-rule-strong hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
