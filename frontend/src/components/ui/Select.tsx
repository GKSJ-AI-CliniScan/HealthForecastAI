import React from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';
import { ChevronDownIcon } from './Icons';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholderOption?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      hint,
      required,
      id,
      options,
      placeholderOption,
      disabled,
      ...props
    },
    ref,
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const baseSelectStyles =
      'block w-full appearance-none rounded-lg border text-sm transition-colors duration-150 focus:outline-none disabled:bg-warm-neutral/50 disabled:text-warm-text-light disabled:cursor-not-allowed dark:disabled:bg-warm-neutral/10 pr-10 pl-3.5 py-2.5';

    const stateStyles = error
      ? 'border-coral-400 bg-coral-50/30 text-coral-900 focus:border-coral-500 focus:ring-2 focus:ring-coral-200 dark:border-coral-600 dark:bg-coral-950/20 dark:text-coral-200 dark:focus:ring-coral-900/40'
      : 'border-warm-border bg-white text-warm-text hover:border-warm-text-light focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-warm-border dark:bg-warm-card dark:text-warm-text dark:hover:border-warm-text-muted dark:focus:border-brand-400 dark:focus:ring-brand-400/20';

    const selectElement = (
      <div className="relative rounded-lg shadow-sm">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error && selectId
              ? `${selectId}-error`
              : hint && selectId
              ? `${selectId}-hint`
              : undefined
          }
          className={cn(baseSelectStyles, stateStyles, className)}
          {...props}
        >
          {placeholderOption && (
            <option value="" disabled className="text-warm-text-light">
              {placeholderOption}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-warm-text-muted">
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </div>
    );

    if (label || error || hint) {
      return (
        <FormField
          label={label}
          htmlFor={selectId}
          error={error}
          hint={hint}
          required={required}
          className={containerClassName}
        >
          {selectElement}
        </FormField>
      );
    }

    return selectElement;
  },
);

Select.displayName = 'Select';
