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
    <div role="alert" className="space-y-3 rounded-[10px] border border-danger/40 bg-danger-tint p-6 text-ink">
      <h2 className="text-section">Something went wrong loading this page.</h2>
      <p className="text-sm text-ink-muted">
        The problem has been logged. You can try again, or go back to the overview.
      </p>
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="btn btn-secondary btn-sm"
        >
          Try again
        </button>
        <a href="/dashboard" className="btn btn-secondary btn-sm">
          Overview
        </a>
      </div>
    </div>
  );
}
