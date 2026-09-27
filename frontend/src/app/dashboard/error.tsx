'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary for the dashboard. Sections handle their own API
 * failures; this only catches something unexpected, and offers a retry
 * rather than a blank screen.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="space-y-3 rounded-lg border border-red-400/50 bg-red-500/10 p-5">
      <h2 className="font-semibold">Something went wrong loading this page.</h2>
      <p className="text-sm opacity-80">
        The problem has been logged. You can try again, or go back to the overview.
      </p>
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-[var(--border)] px-3 py-1.5"
        >
          Try again
        </button>
        <a href="/dashboard" className="rounded-md border border-[var(--border)] px-3 py-1.5">
          Overview
        </a>
      </div>
    </div>
  );
}
