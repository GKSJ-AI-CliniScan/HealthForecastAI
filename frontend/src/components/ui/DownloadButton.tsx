'use client';

import { useState } from 'react';

import { describeFailure } from '@/lib/errors';

/** File name from a Content-Disposition header, if it carries one. */
export function fileNameFrom(disposition: string | null, fallback: string): string {
  if (!disposition) {
    return fallback;
  }
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Fetch a file through a same-origin proxy route and save it.
 *
 * A plain download link would save the backend's JSON error body as the
 * "file" when the request is refused (cohort too small, report file gone), so
 * the response status is checked first and a failure is shown as a message.
 */
export default function DownloadButton({
  href,
  label = 'Download',
  fallbackName,
}: {
  href: string;
  label?: string;
  fallbackName: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(href);
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => ({}));
        const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined;
        setError(describeFailure(response.status, detail).message);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileNameFrom(response.headers.get('content-disposition'), fallbackName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(describeFailure(null, undefined).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="rounded-md border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-50"
      >
        {pending ? 'Preparing…' : label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-xs text-red-500">
          {error}
        </span>
      )}
    </span>
  );
}
