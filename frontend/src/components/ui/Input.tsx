import React from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      hint,
      required,
      id,
      leadingIcon,
      trailingIcon,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const baseInputStyles =
      'block w-full rounded-lg border text-sm transition-colors duration-150 placeholder:text-warm-text-light focus:outline-none disabled:bg-warm-neutral/50 disabled:text-warm-text-light disabled:cursor-not-allowed dark:disabled:bg-warm-neutral/10';

    const stateStyles = error
      ? 'border-coral-400 bg-coral-50/30 text-coral-900 focus:border-coral-500 focus:ring-2 focus:ring-coral-200 dark:border-coral-600 dark:bg-coral-950/20 dark:text-coral-200 dark:focus:ring-coral-900/40'
      : 'border-warm-border bg-white text-warm-text hover:border-warm-text-light focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-warm-border dark:bg-warm-card dark:text-warm-text dark:hover:border-warm-text-muted dark:focus:border-brand-400 dark:focus:ring-brand-400/20';

    const paddingStyles = cn(
      'py-2.5',
      leadingIcon ? 'pl-10' : 'pl-3.5',
      trailingIcon ? 'pr-10' : 'pr-3.5',
    );

    const inputElement = (
      <div className="relative rounded-lg shadow-sm">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-warm-text-muted">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error && inputId
              ? `${inputId}-error`
              : hint && inputId
              ? `${inputId}-hint`
              : undefined
          }
          className={cn(baseInputStyles, stateStyles, paddingStyles, className)}
          {...props}
        />
        {trailingIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-warm-text-muted">
            {trailingIcon}
          </div>
        )}
      </div>
    );

    if (label || error || hint) {
      return (
        <FormField
          label={label}
          htmlFor={inputId}
          error={error}
          hint={hint}
          required={required}
          className={containerClassName}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  },
);

Input.displayName = 'Input';
