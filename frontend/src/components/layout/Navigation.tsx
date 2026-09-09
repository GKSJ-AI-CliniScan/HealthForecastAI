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
  LayersIcon,
  SettingsIcon,
  ClockIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { Role } from '@/types';
import { useAuth } from '@/lib/auth-context';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  isPlaceholder?: boolean;
}

export const ROLE_NAVIGATION: Record<Role, NavItem[]> = {
  doctor: [
    {
      id: 'doc-dashboard',
      name: 'Dashboard',
      href: '/dashboard',
      icon: ActivityIcon,
      isPlaceholder: false,
    },
    {
      id: 'doc-patients',
      name: 'Patients',
      href: '/patients',
      icon: UsersIcon,
      isPlaceholder: false,
    },
    {
      id: 'doc-predictions',
      name: 'Risk Predictions',
      href: '/risk',
      icon: ShieldAlertIcon,
      isPlaceholder: false,
    },
    {
      id: 'doc-treatment-reports',
      name: 'Treatment Reports',
      href: '#treatment-reports',
      icon: StethoscopeIcon,
      isPlaceholder: true,
    },
    {
      id: 'doc-followup',
      name: 'Follow-up Planning',
      href: '#follow-up',
      icon: ClockIcon,
      isPlaceholder: true,
    },
  ],
  hospital_admin: [
    {
      id: 'admin-dashboard',
      name: 'Dashboard',
      href: '/dashboard',
      icon: ActivityIcon,
      isPlaceholder: false,
    },
    {
      id: 'admin-analytics',
      name: 'Hospital Analytics',
      href: '/forecast',
      icon: BarChartIcon,
      isPlaceholder: false,
    },
    {
      id: 'admin-outcomes',
      name: 'Patient Outcomes',
      href: '/patients',
      icon: UsersIcon,
      isPlaceholder: false,
    },
    {
      id: 'admin-dept-performance',
      name: 'Department Performance',
      href: '#department-performance',
      icon: LayersIcon,
      isPlaceholder: true,
    },
    {
      id: 'admin-reports',
      name: 'Reports',
      href: '#reports',
      icon: FileTextIcon,
      isPlaceholder: true,
    },
  ],
  researcher: [
    {
      id: 'res-dashboard',
      name: 'Dashboard',
      href: '/dashboard',
      icon: ActivityIcon,
      isPlaceholder: false,
    },
    {
      id: 'res-analytics',
      name: 'Healthcare Analytics',
      href: '#healthcare-analytics',
      icon: BarChartIcon,
      isPlaceholder: true,
    },
    {
      id: 'res-readmission-trends',
      name: 'Readmission Trends',
      href: '/forecast',
      icon: HeartPulseIcon,
      isPlaceholder: false,
    },
    {
      id: 'res-treatment-analysis',
      name: 'Treatment Analysis',
      href: '#treatment-analysis',
      icon: StethoscopeIcon,
      isPlaceholder: true,
    },
    {
      id: 'res-research-data',
      name: 'Research Data',
      href: '/patients',
      icon: UsersIcon,
      isPlaceholder: false,
    },
  ],
  system_admin: [
    {
      id: 'sys-dashboard',
      name: 'Dashboard',
      href: '/dashboard',
      icon: ActivityIcon,
      isPlaceholder: false,
    },
    {
      id: 'sys-user-mgmt',
      name: 'User Management',
      href: '#user-management',
      icon: UserIcon,
      isPlaceholder: true,
    },
    {
      id: 'sys-role-mgmt',
      name: 'Role Management',
      href: '#role-management',
      icon: ShieldAlertIcon,
      isPlaceholder: true,
    },
    {
      id: 'sys-dataset-mgmt',
      name: 'Dataset Management',
      href: '#dataset-management',
      icon: LayersIcon,
      isPlaceholder: true,
    },
    {
      id: 'sys-model-mgmt',
      name: 'Model Management',
      href: '#model-management',
      icon: ActivityIcon,
      isPlaceholder: true,
    },
    {
      id: 'sys-settings',
      name: 'System Settings',
      href: '#system-settings',
      icon: SettingsIcon,
      isPlaceholder: true,
    },
  ],
};

interface NavigationProps {
  onItemClick?: () => void;
  className?: string;
}

export function Navigation({ onItemClick, className }: NavigationProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? 'doctor';
  const navItems = ROLE_NAVIGATION[role] || ROLE_NAVIGATION.doctor;

  return (
    <nav className={cn('space-y-1 px-3 py-2', className)} aria-label="Main Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          !item.isPlaceholder &&
          (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));

        if (item.isPlaceholder) {
          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-warm-text-light/70 dark:text-warm-text-light/50 cursor-not-allowed select-none"
              title={`${item.name} (Upcoming Module)`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-warm-text-light/50 dark:text-warm-text-light/30" />
                <span>{item.name}</span>
              </div>
              <span className="text-[10px] text-warm-text-light/60 uppercase">
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
                ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-950/60 dark:text-brand-300 shadow-xs'
                : 'text-warm-text-muted hover:bg-warm-neutral/50 hover:text-warm-text dark:text-warm-text-muted dark:hover:bg-warm-neutral/20 dark:hover:text-warm-text',
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive
                    ? 'text-brand-500 dark:text-brand-400'
                    : 'text-warm-text-light group-hover:text-warm-text dark:text-warm-text-muted',
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
