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
      className="btn btn-secondary btn-sm"
    >
      {pending ? 'Retrying…' : label}
    </button>
  );
}
