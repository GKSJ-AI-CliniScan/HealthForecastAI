'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Triggers a 30-day readmission forecast for one admission. Mirrors ScoreRiskButton. */
export default function ForecastReadmissionButton({
  patientId,
  admissionId,
}: {
  patientId: number;
  admissionId: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function forecast() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/risk/readmission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, admission_id: admissionId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.detail ?? 'Could not forecast this admission.');
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
        onClick={forecast}
        disabled={pending}
        className="btn btn-secondary btn-sm"
      >
        {pending ? 'Forecasting…' : 'Forecast readmission (most recent admission)'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
