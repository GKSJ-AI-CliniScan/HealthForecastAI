import React from 'react';
import { cn } from '@/lib/utils';
import { Role } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'riskLow'
    | 'riskMedium'
    | 'riskHigh'
    | 'doctor'
    | 'admin'
    | 'researcher';
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800',
    outline:
      'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
    secondary:
      'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    danger:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    info:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    riskLow:
      'bg-emerald-100/70 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
    riskMedium:
      'bg-amber-100/70 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
    riskHigh:
      'bg-rose-100/70 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300',
    doctor:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    admin:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    researcher:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const roleConfig: Record<Role, { label: string; variant: BadgeProps['variant'] }> = {
    doctor: { label: 'Doctor', variant: 'doctor' },
    hospital_admin: { label: 'Hospital Admin', variant: 'admin' },
    researcher: { label: 'Researcher', variant: 'researcher' },
    system_admin: { label: 'System Admin', variant: 'info' },
  };

  const config = roleConfig[role] || { label: role, variant: 'secondary' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
