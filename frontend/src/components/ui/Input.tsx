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
      'block w-full rounded-lg border text-sm transition-colors duration-150 placeholder:text-slate-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-800/50';

    const stateStyles = error
      ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20 dark:text-red-200 dark:focus:ring-red-900/40'
      : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-400/20';

    const paddingStyles = cn(
      'py-2.5',
      leadingIcon ? 'pl-10' : 'pl-3.5',
      trailingIcon ? 'pr-10' : 'pr-3.5',
    );

    const inputElement = (
      <div className="relative rounded-lg shadow-sm">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
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
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500">
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
