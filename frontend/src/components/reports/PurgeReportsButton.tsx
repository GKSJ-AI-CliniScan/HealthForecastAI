'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { describeFailure } from '@/lib/errors';
import type { ReportPurgeResult } from '@/types';

/** System administrators only: remove reports older than the configured retention window. */
export default function PurgeReportsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  async function purge() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch('/api/reports/purge', { method: 'POST' });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined;
        setMessage({ text: describeFailure(response.status, detail).message, failed: true });
        return;
      }
      const result = body as ReportPurgeResult;
      setMessage({
        text: `Removed ${result.deleted} report${result.deleted === 1 ? '' : 's'} older than ${result.older_than_days} days.`,
        failed: false,
      });
      router.refresh();
    } catch {
      setMessage({ text: describeFailure(null, undefined).message, failed: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={purge}
        disabled={pending}
        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs disabled:opacity-50"
      >
        {pending ? 'Purging…' : 'Purge expired reports'}
      </button>
      {message && (
        <span role={message.failed ? 'alert' : 'status'} className="text-xs opacity-80">
          {message.text}
        </span>
      )}
    </span>
  );
}
