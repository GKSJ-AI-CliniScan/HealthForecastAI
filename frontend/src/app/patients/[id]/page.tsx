'use client';
/**
 * One patient (/patients/{id}) — Milestone 1 records + Milestone 2 risk + M3 care.
 *
 * Order = what a doctor needs first:
 *   1. big risk number with plain sentence ("Chance of returning … 72%")
 *   2. basic details as a definition list
 *   3. hospital visits, newest first (stay length, returned within 30 days?)
 *   4. buttons → Risk check / Care advice for THIS patient (if the role allows)
 * Data: GET /patients/{id}. Only what the backend returns is shown — no invented
 * allergies or medicines (the old page displayed mock ones).
 */
import { useParams } from 'next/navigation';

import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { canOpen } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { AppShell } from '@/saral/AppShell';
import { orDash } from '@/saral/format';
import { LinkButton, LoadState, PageHeader, RiskBadge, Section, SimpleTable } from '@/saral/ui';
import { useData } from '@/saral/useData';

export default function PatientPage() {
  return (
    <AppShell page="patients">
      <Patient />
    </AppShell>
  );
}

function Patient() {
  const { t, formatNumber } = useI18n();
  const { user } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const q = useData(() => data.patient(id), [id]);

  return (
    <LoadState q={q}>
      {(p) => (
        <>
          <PageHeader title={p.name} help={t('help.patient')}>
            <LinkButton href="/patients" icon="←">
              {t('common.back')}
            </LinkButton>
          </PageHeader>

          <div className="mb-8 rounded-2xl border-2 border-line bg-paper-raised p-6">
            <p className="text-lg text-ink-soft">{t('risk.chance', { days: 30 })}</p>
            <p className="my-2 text-6xl font-bold tabular-nums">{formatNumber(p.riskPct, 0)}%</p>
            <RiskBadge level={p.risk} />
            <div className="mt-5 flex flex-wrap gap-2">
              {canOpen(user!.role, 'risk') && <LinkButton href={`/risk?patient=${p.id}`} icon="❤️">{t('nav.risk')}</LinkButton>}
              {canOpen(user!.role, 'care') && (
                <LinkButton href={`/clinical-support?patient=${p.id}`} icon="🩺">
                  {t('nav.care')}
                </LinkButton>
              )}
            </div>
          </div>

          <dl className="mb-8 grid gap-3 sm:grid-cols-2">
            {[
              [t('patient.record'), p.mrn],
              [t('patient.age'), orDash(p.ageGroup)],
              [t('patient.gender'), orDash(p.gender)],
              [t('patient.illness'), orDash(p.illness)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border-2 border-line bg-paper-raised p-4">
                <dt className="text-base text-ink-soft">{k}</dt>
                <dd className="text-xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <Section title={t('patient.visits')} id="visits">
            {p.visits.length === 0 ? (
              <p className="text-xl text-ink-soft">{t('patient.none')}</p>
            ) : (
              <SimpleTable
                caption={t('patient.visits')}
                headers={['#', t('stat.avgStay'), t('stat.cameBack')]}
                rows={[...p.visits].reverse().map((v, i) => [
                  orDash(v.admittedOn) === '—' ? String(p.visits.length - i) : v.admittedOn!,
                  v.daysStayed === null ? '—' : t('patient.stayed', { n: v.daysStayed }),
                  v.returned30 === null ? '—' : v.returned30 ? `⚠ ${t('patient.cameBack')}` : `✓ ${t('patient.didNotComeBack')}`,
                ])}
              />
            )}
          </Section>
        </>
      )}
    </LoadState>
  );
}
