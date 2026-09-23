'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Triggers a new risk score for a patient, then refreshes the page to show it. */
export default function ScoreRiskButton({ patientId }: { patientId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function score() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/risk/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.detail ?? 'Could not score this patient.');
        return;
      }
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={score}
        disabled={pending}
        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {pending ? 'Scoring…' : 'Score risk'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
