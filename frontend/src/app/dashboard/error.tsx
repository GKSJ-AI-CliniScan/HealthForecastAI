'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Dashboard error boundary.
 *
 * Replaces the framework's default error screen, which exposes a stack trace.
 * The message stays non-technical because the reader is a clinician, not an
 * engineer; the digest is shown small so it can still be quoted in a support
 * request without dominating the page.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console for whoever is debugging; never rendered
    // as a stack trace to the user.
    console.error('Dashboard error boundary caught:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-5 py-12 text-center">
      <div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm opacity-70">
          We could not load this section. Your data has not been changed. This is usually temporary
          &mdash; trying again often resolves it.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-[var(--foreground)] px-4 py-2 font-medium text-[var(--background)]"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-[var(--border)] px-4 py-2 font-medium"
        >
          Back to overview
        </Link>
      </div>

      {error.digest && (
        <p className="text-xs opacity-50">
          If this keeps happening, quote reference <code>{error.digest}</code>.
        </p>
      )}
    </div>
  );
}
