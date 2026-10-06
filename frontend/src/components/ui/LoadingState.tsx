import React from 'react';
import { cn } from '@/lib/utils';
import { PulseIcon } from './Icons';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({
  title = 'Loading Clinical Data...',
  description = 'Retrieving real-time patient intelligence',
  fullPage = false,
  size = 'md',
  className,
}: LoadingStateProps) {
  const sizeMap = {
    sm: {
      icon: 'h-6 w-6',
      spinner: 'h-10 w-10',
      title: 'text-xs font-semibold',
      desc: 'text-[11px]',
    },
    md: {
      icon: 'h-8 w-8',
      spinner: 'h-14 w-14',
      title: 'text-sm font-semibold',
      desc: 'text-xs',
    },
    lg: {
      icon: 'h-10 w-10',
      spinner: 'h-20 w-20',
      title: 'text-base font-bold',
      desc: 'text-sm',
    },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center text-center p-6 space-y-3.5',
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer Glow / Ring */}
        <div
          className={cn(
            'animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-900/60 dark:border-t-brand-400',
            currentSize.spinner,
          )}
        />
        {/* Center Pulse Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-brand-500 dark:text-brand-400">
          <PulseIcon className={cn('animate-pulse', currentSize.icon)} />
        </div>
      </div>

      <div className="space-y-1">
        <h4 className={cn('text-warm-text dark:text-warm-text', currentSize.title)}>
          {title}
        </h4>
        {description && (
          <p className={cn('text-warm-text-muted dark:text-warm-text-muted', currentSize.desc)}>
            {description}
          </p>
        )}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-warm-bg/80 backdrop-blur-sm dark:bg-warm-card/80">
        <div className="rounded-2xl border border-warm-border bg-white p-8 shadow-xl dark:border-warm-border dark:bg-warm-card">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
