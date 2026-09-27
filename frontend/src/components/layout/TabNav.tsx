'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavLink } from '@/lib/navigation';

/** Horizontal tab strip; the tab matching the current path is marked current. */
export default function TabNav({ tabs, label }: { tabs: NavLink[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 border-b border-[var(--border)]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active ? 'border-indigo-500 font-medium' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
