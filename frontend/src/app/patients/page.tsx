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
import { Avatar, Button, CARD, INPUT, LoadState, PageHeader, RiskBadge, RiskBar } from '@/saral/ui';
import { ChevronRight, Search } from 'lucide-react';
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
      {/* Toolbar card: search + risk filter, one row on desktop. */}
      <div className={`${CARD} mb-5 flex flex-wrap items-end gap-4 p-4`}>
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="search" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('patients.hint')}
          </label>
          <div className="relative">
            <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={`${INPUT} pl-10`} />
          </div>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">{t('patients.riskFilter')}</legend>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f} variant="quiet" pressed={risk === f} onClick={() => setRisk(f)}>
                {f === 'all' ? t('common.all') : t(`risk.${f}`)}
              </Button>
            ))}
          </div>
        </fieldset>
      </div>

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
      <p role="status" className="mb-3 text-sm font-semibold text-ink-soft">
        {t('patients.found', { n: rows.length })}
      </p>
      {/* Desktop: a real table (scan many patients quickly). Phones: one card per patient. */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-card md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t('nav.patients')}</caption>
          <thead>
            <tr className="bg-paper-sunk text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th scope="col" className="px-5 py-3">
                {t('users.name')}
              </th>
              <th scope="col" className="px-5 py-3">
                {t('patient.age')}
              </th>
              <th scope="col" className="px-5 py-3">
                {t('patient.illness')}
              </th>
              <th scope="col" className="px-5 py-3">
                {t('risk.chance', { days: 30 })}
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">{t('common.open')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line hover:bg-paper">
                <th scope="row" className="px-5 py-3 font-normal">
                  <Link href={`/patients/${p.id}`} className="flex items-center gap-3 rounded-lg hover:text-teal">
                    <Avatar name={p.name} tone={p.risk} />
                    <span>
                      <span className="block font-semibold text-ink">{p.name}</span>
                      <span className="block text-sm text-ink-soft">{p.mrn}</span>
                    </span>
                  </Link>
                </th>
                <td className="px-5 py-3 text-ink">{orDash(p.ageGroup)}</td>
                <td className="px-5 py-3 text-ink">{orDash(p.illness)}</td>
                <td className="px-5 py-3">
                  <span className="flex flex-wrap items-center gap-3">
                    <RiskBar level={p.risk} pct={p.riskPct} />
                    <RiskBadge level={p.risk} />
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/patients/${p.id}`}
                    aria-label={`${t('common.open')}: ${p.name}`}
                    className="inline-grid h-10 w-10 place-items-center rounded-xl text-ink-soft hover:bg-teal-bg hover:text-teal"
                  >
                    <ChevronRight aria-hidden="true" size={20} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/patients/${p.id}`} className={`${CARD} flex items-center gap-3 p-4`}>
              <Avatar name={p.name} tone={p.risk} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{p.name}</span>
                <span className="block text-sm text-ink-soft">
                  {p.mrn} · {orDash(p.ageGroup)} · {orDash(p.illness)}
                </span>
                <span className="mt-2 block">
                  <RiskBadge level={p.risk} pct={p.riskPct} />
                </span>
              </span>
              <ChevronRight aria-hidden="true" size={20} className="text-ink-soft" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
