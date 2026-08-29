import React from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon } from './Icons';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, disabled, checked, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col space-y-1">
        <label
          htmlFor={inputId}
          className={cn(
            'group relative flex items-start gap-2.5 select-none cursor-pointer',
            disabled ? 'cursor-not-allowed opacity-60' : '',
            className,
          )}
        >
          <div className="relative flex items-center pt-0.5">
            <input
              ref={ref}
              type="checkbox"
              id={inputId}
              disabled={disabled}
              checked={checked}
              aria-invalid={Boolean(error)}
              className="peer sr-only"
              {...props}
            />
            <div
              className={cn(
                'h-4 w-4 rounded border transition-all duration-150 flex items-center justify-center',
                error
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                  : 'border-slate-300 bg-white group-hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800',
                'peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-checked:text-white',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2',
              )}
            >
              <CheckIcon className="h-3 w-3 text-white stroke-[3] opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
            </div>
          </div>
          {(label || description) && (
            <div className="flex flex-col text-sm leading-tight">
              {label && (
                <span className="font-normal text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                  {label}
                </span>
              )}
              {description && (
                <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400 pl-6.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
