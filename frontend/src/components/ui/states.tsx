import type { ReactNode } from 'react';

import type { Loaded, UiError } from '@/lib/errors';

import { Card } from './index';
import RetryButton from './RetryButton';

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-rule-strong bg-sunken/60 px-4 py-8 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}

/**
 * A failed section. Permission and small-cohort failures are explained, not
 * retried - retrying cannot change them - while a transient failure gets a
 * Retry button. Only a real failure uses the danger colour; a restriction is
 * shown as information.
 */
export function SectionError({ error }: { error: UiError }) {
  const retryable = error.kind === 'failed';
  const tone = retryable
    ? 'border-danger/40 bg-danger-tint'
    : 'border-brand/25 bg-brand-tint/70';
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm text-ink ${tone}`}
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
      className="animate-pulse rounded-[10px] border border-rule bg-surface"
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
      <div className="space-y-2">
        <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-ink/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-ink/5" />
      </div>
      <p className="sr-only" role="status">
        Loading {title}…
      </p>
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <LoadingBlock key={key} height={84} />
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
  description,
  children,
}: {
  title: string;
  result: Loaded<T>;
  isEmpty?: (data: T) => boolean;
  empty?: string;
  actions?: ReactNode;
  description?: ReactNode;
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
    <Card title={title} actions={actions} description={description}>
      {body}
    </Card>
  );
}
