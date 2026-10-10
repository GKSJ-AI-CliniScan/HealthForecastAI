import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    circular: 'rounded-full shrink-0',
    rectangular: 'rounded-lg',
    card: 'h-32 w-full rounded-xl',
  };

  const inlineStyles: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-warm-neutral/70 dark:bg-warm-neutral/30',
        variantStyles[variant],
        className,
      )}
      style={inlineStyles}
      {...props}
    />
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-warm-border/60 dark:border-warm-border/40">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <Skeleton
            className={cn(
              'h-4',
              i === 0 ? 'w-24' : i === 1 ? 'w-36' : i === 2 ? 'w-20' : 'w-28',
            )}
          />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-warm-border bg-white p-6 shadow-sm dark:border-warm-border dark:bg-warm-card space-y-4',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton variant="circular" className="h-8 w-8" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function ChartSkeleton({ height = 280, className }: { height?: number; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-warm-border bg-white p-6 shadow-sm dark:border-warm-border dark:bg-warm-card space-y-4',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div
        className="flex items-end justify-between gap-3 pt-6 pb-2 px-4 bg-warm-neutral/20 dark:bg-warm-neutral/10 rounded-lg"
        style={{ height: `${height}px` }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <Skeleton
              className="w-full rounded-t-md"
              style={{ height: `${Math.max(20, ((i * 17) % 80) + 20)}%` }}
            />
            <Skeleton className="h-2.5 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailHeaderSkeleton() {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-5 shadow-sm dark:border-warm-border dark:bg-warm-card">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <div className="flex gap-4 border-t lg:border-t-0 lg:border-l border-warm-border/60 pt-3 lg:pt-0 lg:pl-5 dark:border-warm-border/60">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
