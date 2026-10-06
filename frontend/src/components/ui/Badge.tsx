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
      'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800',
    outline:
      'border-warm-border text-warm-text dark:border-warm-border dark:text-warm-text',
    secondary:
      'bg-warm-neutral text-warm-text border-warm-border dark:bg-warm-neutral/20 dark:text-warm-text dark:border-warm-border',
    success:
      'bg-sage-50 text-sage-700 border-sage-200 dark:bg-sage-900/40 dark:text-sage-200 dark:border-sage-800',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
    danger:
      'bg-coral-50 text-coral-700 border-coral-200 dark:bg-coral-900/40 dark:text-coral-200 dark:border-coral-800',
    info:
      'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800',
    riskLow:
      'bg-sage-100/90 text-sage-800 border-sage-300 dark:bg-sage-900/50 dark:text-sage-200 dark:border-sage-700 font-bold',
    riskMedium:
      'bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700 font-bold',
    riskHigh:
      'bg-coral-100/90 text-coral-900 border-coral-300 dark:bg-coral-900/50 dark:text-coral-200 dark:border-coral-700 font-bold',
    doctor:
      'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800',
    admin:
      'bg-warm-neutral text-warm-text border-warm-border dark:bg-warm-neutral/30 dark:text-warm-text dark:border-warm-border',
    researcher:
      'bg-sage-50 text-sage-700 border-sage-200 dark:bg-sage-900/50 dark:text-sage-200 dark:border-sage-800',
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
