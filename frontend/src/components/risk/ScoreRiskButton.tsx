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
        className="btn btn-secondary btn-sm"
      >
        {pending ? 'Scoring…' : 'Score risk'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
