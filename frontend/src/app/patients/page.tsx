'use client';
/**
 * Patients list (/patients) — Milestone 1 "patient management".
 *
 * Simple: one search box + four big filter buttons (All / High / Medium / Low).
 * Each patient is a large card (not a dense table) showing name, record no.,
 * age, illness and a risk badge; the whole card is one link.
 * Data: GET /patients (backend already limits a doctor to assigned patients).
 * Filtering is done here in the browser — the list is small and it makes
 * typing feel instant. The result count is announced to screen readers.
 * FLOWS NEXT: card → /patients/{id}.
 */
import Link from 'next/link';
import { useState } from 'react';

import { data, type PatientRow, type RiskLevel } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { orDash } from '@/saral/format';
import { Button, INPUT, LoadState, PageHeader, RiskBadge } from '@/saral/ui';
import { useData } from '@/saral/useData';
import { filterPatients } from '@/saral/filterPatients';

export default function PatientsPage() {
  return (
    <AppShell page="patients">
      <Patients />
    </AppShell>
  );
}

const FILTERS: (RiskLevel | 'all')[] = ['all', 'high', 'medium', 'low'];

function Patients() {
  const { t } = useI18n();
  const q = useData(() => data.patients(), []);
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all');

  return (
    <>
      <PageHeader title={t('nav.patients')} help={t('help.patients')} />
      <label htmlFor="search" className="mb-2 block text-lg font-semibold">
        {t('patients.hint')}
      </label>
      <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={`${INPUT} mb-4 max-w-xl`} />

      <fieldset className="mb-6">
        <legend className="mb-2 text-lg font-semibold">{t('patients.riskFilter')}</legend>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button key={f} variant="quiet" pressed={risk === f} onClick={() => setRisk(f)}>
              {f === 'all' ? t('common.all') : t(`risk.${f}`)}
            </Button>
          ))}
        </div>
      </fieldset>

      <LoadState q={q} isEmpty={(rows) => rows.length === 0}>
        {(rows) => <PatientCards rows={filterPatients(rows, query, risk)} />}
      </LoadState>
    </>
  );
}

function PatientCards({ rows }: { rows: PatientRow[] }) {
  const { t } = useI18n();
  return (
    <>
      {/* role=status: screen readers hear "12 patients found" after each keystroke settles */}
      <p role="status" className="mb-4 text-xl font-semibold">
        {t('patients.found', { n: rows.length })}
      </p>
      <ul className="grid gap-3">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/patients/${p.id}`} className="block rounded-2xl border-2 border-line bg-paper-raised p-4 hover:border-teal">
              <span className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xl font-bold">{p.name}</span>
                <RiskBadge level={p.risk} pct={p.riskPct} />
              </span>
              <span className="mt-1 block text-lg text-ink-soft">
                {t('patient.record')}: {p.mrn} · {t('patient.age')}: {orDash(p.ageGroup)} · {t('patient.illness')}: {orDash(p.illness)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
