'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/** Re-run the page's server-side data loading without a full reload. */
export default function RetryButton({ label = 'Retry' }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-md border border-[var(--border)] px-3 py-1 text-xs disabled:opacity-50"
    >
      {pending ? 'Retrying…' : label}
    </button>
  );
}
