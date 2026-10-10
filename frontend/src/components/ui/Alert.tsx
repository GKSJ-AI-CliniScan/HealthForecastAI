import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircleIcon, CheckCircleIcon } from './Icons';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: AlertProps) {
  const variantStyles = {
    info: 'bg-brand-50/90 border-brand-200 text-brand-900 dark:bg-brand-950/40 dark:border-brand-900 dark:text-brand-200',
    success:
      'bg-sage-50/90 border-sage-200 text-sage-900 dark:bg-sage-900/40 dark:border-sage-800 dark:text-sage-200',
    warning:
      'bg-amber-50/90 border-amber-200 text-amber-900 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-200',
    danger:
      'bg-coral-50/90 border-coral-200 text-coral-900 dark:bg-coral-900/40 dark:border-coral-800 dark:text-coral-200',
  };

  const iconStyles = {
    info: 'text-brand-600 dark:text-brand-400',
    success: 'text-sage-600 dark:text-sage-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-coral-600 dark:text-coral-400',
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 flex items-start gap-3 text-sm',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      <div className={cn('shrink-0 mt-0.5', iconStyles[variant])}>
        {variant === 'success' ? (
          <CheckCircleIcon className="h-5 w-5" />
        ) : (
          <AlertCircleIcon className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-xs sm:text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
