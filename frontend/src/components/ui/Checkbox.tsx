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
                  ? 'border-coral-500 bg-coral-50 dark:bg-coral-950/30'
                  : 'border-warm-border bg-white group-hover:border-warm-text-light dark:border-warm-border dark:bg-warm-card',
                'peer-checked:bg-brand-500 peer-checked:border-brand-500 peer-checked:text-white',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2',
              )}
            >
              <CheckIcon className="h-3 w-3 text-white stroke-[3] opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
            </div>
          </div>
          {(label || description) && (
            <div className="flex flex-col text-sm leading-tight">
              {label && (
                <span className="font-normal text-warm-text dark:text-warm-text group-hover:text-warm-text">
                  {label}
                </span>
              )}
              {description && (
                <span className="mt-0.5 text-xs text-warm-text-muted dark:text-warm-text-muted">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="text-xs font-medium text-coral-600 dark:text-coral-400 pl-6.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
