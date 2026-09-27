import type { ReactNode } from 'react';

import type { Loaded, UiError } from '@/lib/errors';

import { Card } from './index';
import RetryButton from './RetryButton';

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm opacity-70">
      {children}
    </p>
  );
}

/**
 * A failed section. Permission and small-cohort failures are explained, not
 * retried - retrying cannot change them - while a transient failure gets a
 * Retry button.
 */
export function SectionError({ error }: { error: UiError }) {
  const retryable = error.kind === 'failed';
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm"
    >
      <span>{error.message}</span>
      {retryable && <RetryButton />}
    </div>
  );
}

/** Shown when a page is opened directly by a role the backend would refuse. */
export function NoAccess({ what }: { what: string }) {
  return (
    <SectionError
      error={{
        kind: 'forbidden',
        status: 403,
        message: `Your role does not have access to ${what}.`,
      }}
    />
  );
}

export function LoadingBlock({ label = 'Loading…', height = 160 }: { label?: string; height?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pulse rounded-md bg-black/5 dark:bg-white/5"
      style={{ height }}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Page-level skeleton used by the loading.tsx files while server data streams in. */
export function PageLoading({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div className="h-7 w-64 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <p className="sr-only" role="status">
        Loading {title}…
      </p>
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <LoadingBlock key={key} height={76} />
        ))}
      </div>
      <LoadingBlock height={260} />
      <LoadingBlock height={220} />
    </div>
  );
}

/**
 * A card whose body depends on one backend read: renders the error, the empty
 * state, or the data - so every section handles all three the same way.
 */
export function LoadedCard<T>({
  title,
  result,
  isEmpty,
  empty,
  actions,
  children,
}: {
  title: string;
  result: Loaded<T>;
  isEmpty?: (data: T) => boolean;
  empty?: string;
  actions?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  let body: ReactNode;
  if (!result.ok) {
    body = <SectionError error={result.error} />;
  } else if (isEmpty?.(result.data)) {
    body = <EmptyState>{empty ?? 'No data for this view yet.'}</EmptyState>;
  } else {
    body = children(result.data);
  }
  return (
    <Card title={title} actions={actions}>
      {body}
    </Card>
  );
}
