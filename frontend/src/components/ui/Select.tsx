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
      'block w-full appearance-none rounded-lg border text-sm transition-colors duration-150 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-800/50 pr-10 pl-3.5 py-2.5';

    const stateStyles = error
      ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20 dark:text-red-200 dark:focus:ring-red-900/40'
      : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-400/20';

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
            <option value="" disabled className="text-slate-400">
              {placeholderOption}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500">
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
