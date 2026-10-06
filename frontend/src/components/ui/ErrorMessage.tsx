import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircleIcon, RefreshCwIcon } from './Icons';
import { Button } from './Button';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  variant?: 'card' | 'inline' | 'banner';
}

export function ErrorMessage({
  title = 'Encountered an Error',
  message,
  onRetry,
  isRetrying = false,
  className,
  variant = 'card',
}: ErrorMessageProps) {
  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center gap-2 text-xs font-medium text-coral-600 dark:text-coral-400',
          className,
        )}
      >
        <AlertCircleIcon className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center justify-between rounded-lg border border-coral-200 bg-coral-50/90 px-4 py-3 text-sm text-coral-900 dark:border-coral-900/60 dark:bg-coral-950/40 dark:text-coral-200',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <AlertCircleIcon className="h-5 w-5 shrink-0 text-coral-600 dark:text-coral-400" />
          <div>
            <span className="font-semibold">{title}: </span>
            <span>{message}</span>
          </div>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            isLoading={isRetrying}
            leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
            className="shrink-0 border-coral-300 text-coral-800 hover:bg-coral-100 dark:border-coral-800 dark:text-coral-300 dark:hover:bg-coral-900"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Card Variant (Default)
  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-coral-200 bg-coral-50/60 p-6 text-center shadow-sm dark:border-coral-900/60 dark:bg-coral-950/20 sm:p-8',
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-coral-100 text-coral-600 dark:bg-coral-900/40 dark:text-coral-400">
        <AlertCircleIcon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-bold text-coral-900 dark:text-coral-200">
        {title}
      </h3>
      <p className="mt-1 text-xs text-coral-800/90 dark:text-coral-300/80 max-w-md mx-auto leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            isLoading={isRetrying}
            leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
            className="border-coral-300 text-coral-800 hover:bg-coral-100 dark:border-coral-800 dark:text-coral-300 dark:hover:bg-coral-900/60"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
