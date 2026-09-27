'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { describeFailure } from '@/lib/errors';

/** Two-step delete: the first click asks for confirmation, the second deletes. */
export default function DeleteReportButton({ reportId }: { reportId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => ({}));
        const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined;
        setError(describeFailure(response.status, detail).message);
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      setError(describeFailure(null, undefined).message);
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {confirming ? (
        <span className="flex gap-1">
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-md border border-red-500 px-3 py-1 text-sm text-red-600 disabled:opacity-50"
          >
            {pending ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-md border border-[var(--border)] px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-sm"
        >
          Delete
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-red-500">
          {error}
        </span>
      )}
    </span>
  );
}
