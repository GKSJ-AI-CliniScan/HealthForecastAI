'use client';

import React from 'react';
import { Role, ROLE_LABELS } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { authService } from '@/services/authService';
import {
  StethoscopeIcon,
  BarChartIcon,
  UsersIcon,
  ShieldAlertIcon,
} from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export function RoleSwitcher() {
  const { user, login } = useAuth();
  const currentRole: Role = user?.role ?? 'doctor';

  const roles: { role: Role; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { role: 'doctor', label: ROLE_LABELS.doctor, icon: StethoscopeIcon },
    { role: 'hospital_admin', label: ROLE_LABELS.hospital_admin, icon: BarChartIcon },
    { role: 'researcher', label: ROLE_LABELS.researcher, icon: UsersIcon },
    { role: 'system_admin', label: ROLE_LABELS.system_admin, icon: ShieldAlertIcon },
  ];

  const handleRoleSelect = async (newRole: Role) => {
    const demoAccounts = authService.getDemoAccounts();
    const targetAccount = demoAccounts.find((a) => a.role === newRole);
    if (targetAccount) {
      await login(targetAccount.email, 'HealthcareDemo2026!');
    }
  };

  return (
    <div className="rounded-xl border border-warm-border bg-white p-3.5 shadow-sm dark:border-warm-border dark:bg-warm-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-warm-text-muted dark:text-warm-text-muted">
            Switch Role View:
          </span>
          <span className="text-[11px] text-warm-text-light dark:text-warm-text-light">
            (Simulates frontend RBAC permissions)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
          {roles.map(({ role, label, icon: Icon }) => {
            const isSelected = currentRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => void handleRoleSelect(role)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                  isSelected
                    ? 'bg-brand-500 text-white shadow-sm ring-1 ring-brand-600 dark:bg-brand-500'
                    : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral hover:text-warm-text dark:bg-warm-neutral/20 dark:text-warm-text-muted dark:hover:bg-warm-neutral/30',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isSelected ? 'text-white' : 'text-warm-text-muted')} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
