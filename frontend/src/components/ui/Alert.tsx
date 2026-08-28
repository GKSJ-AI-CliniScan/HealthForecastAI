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
    info: 'bg-blue-50/80 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200',
    success:
      'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200',
    warning:
      'bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200',
    danger:
      'bg-red-50/80 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200',
  };

  const iconStyles = {
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
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
