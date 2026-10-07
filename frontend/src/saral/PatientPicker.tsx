'use client';
/**
 * PatientPicker.tsx — "Choose a patient" box used by Risk check and Care advice.
 *
 * WHY A NATIVE <select>: simplest control for non-technical and screen-reader
 * users; phones show their own big list. Each option reads
 * "Patient name — High risk", so risk is known before opening.
 * The choice is mirrored in the URL (?patient=12) so a link from the patient
 * page opens the right patient, and Back works as expected.
 * FLOWS NEXT: the parent page loads risk/advice for the chosen id.
 */
import { useEffect } from 'react';

import { data, type PatientRow } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { INPUT, LoadState } from './ui';
import { useData } from './useData';

/** Reads ?patient=ID once on the client (no useSearchParams → no Suspense needed). */
export function patientFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const v = Number(new URLSearchParams(window.location.search).get('patient'));
  return Number.isInteger(v) && v > 0 ? v : null;
}

export function PatientPicker({ value, onChange }: { value: number | null; onChange: (id: number) => void }) {
  const { t } = useI18n();
  const q = useData(() => data.patients(), []);

  // Keep the URL in sync without adding history entries.
  useEffect(() => {
    if (value === null) return;
    const url = new URL(window.location.href);
    url.searchParams.set('patient', String(value));
    window.history.replaceState(null, '', url);
  }, [value]);

  return (
    <div className="mb-8 max-w-xl">
      <label htmlFor="patient-pick" className="mb-2 block text-lg font-semibold">
        {t('risk.choose')}
      </label>
      <LoadState q={q} isEmpty={(rows: PatientRow[]) => rows.length === 0}>
        {(rows) => (
          <select
            id="patient-pick"
            className={INPUT}
            value={value ?? ''}
            onChange={(e) => e.target.value && onChange(Number(e.target.value))}
          >
            <option value="">—</option>
            {rows.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {t(`risk.${p.risk}`)}
              </option>
            ))}
          </select>
        )}
      </LoadState>
    </div>
  );
}
