'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ActivityIcon,
  UsersIcon,
  ShieldAlertIcon,
  HeartPulseIcon,
  StethoscopeIcon,
  BarChartIcon,
  FileTextIcon,
} from '@/components/ui/Icons';
import { Role } from '@/types';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  isPlaceholder?: boolean;
  allowedRoles?: Role[];
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/',
    icon: ActivityIcon,
    isPlaceholder: false,
  },
  {
    id: 'patients',
    name: 'Patients',
    href: '#',
    icon: UsersIcon,
    isPlaceholder: true,
  },
  {
    id: 'risk-prediction',
    name: 'Risk Prediction',
    href: '#',
    icon: ShieldAlertIcon,
    isPlaceholder: true,
  },
  {
    id: 'readmission',
    name: 'Readmission',
    href: '#',
    icon: HeartPulseIcon,
    isPlaceholder: true,
  },
  {
    id: 'treatment',
    name: 'Treatment',
    href: '#',
    icon: StethoscopeIcon,
    isPlaceholder: true,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    href: '#',
    icon: BarChartIcon,
    isPlaceholder: true,
  },
  {
    id: 'reports',
    name: 'Reports',
    href: '#',
    icon: FileTextIcon,
    isPlaceholder: true,
  },
];

interface NavigationProps {
  onItemClick?: () => void;
  className?: string;
}

export function Navigation({ onItemClick, className }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('space-y-1 px-3 py-2', className)} aria-label="Main Navigation">
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = !item.isPlaceholder && pathname === item.href;

        if (item.isPlaceholder) {
          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed select-none"
              title={`${item.name} (Upcoming Module)`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                <span>{item.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-600 uppercase">
                Soon
              </span>
            </div>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onItemClick}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-950/60 dark:text-brand-300'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500',
                )}
              />
              <span>{item.name}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
