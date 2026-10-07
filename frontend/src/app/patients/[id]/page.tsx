'use client';
/**
 * One patient (/patients/{id}) — Milestone 1 records + Milestone 2 risk + M3 care.
 *
 * v2 layout:
 *   [ profile card: avatar · name · record no. · risk badge · actions ]
 *   [ risk gauge card ]  [ details grid (age, gender, illness, record) ]
 *   [ hospital visits table, newest first ]
 * Data: GET /patients/{id}. Only what the backend returns is shown — no invented
 * allergies or medicines (the old page displayed mock ones).
 */
import { useParams } from 'next/navigation';
import { ArrowLeft, HeartPulse, Stethoscope } from 'lucide-react';

import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { canOpen } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { AppShell } from '@/saral/AppShell';
import { orDash } from '@/saral/format';
import { RiskGauge } from '@/saral/RiskGauge';
import { Avatar, CARD, LinkButton, LoadState, PageHeader, RiskBadge, Section, SimpleTable } from '@/saral/ui';
import { useData } from '@/saral/useData';

export default function PatientPage() {
  return (
    <AppShell page="patients">
      <Patient />
    </AppShell>
  );
}

function Patient() {
  const { t } = useI18n();
  const { user } = useSession();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const q = useData(() => data.patient(id), [id]);

  return (
    <LoadState q={q}>
      {(p) => (
        <>
          <PageHeader title={p.name} help={t('help.patient')}>
            <LinkButton href="/patients" icon={<ArrowLeft size={18} />}>
              {t('common.back')}
            </LinkButton>
          </PageHeader>

          <div className={`${CARD} mb-6 flex flex-wrap items-center gap-4 p-5`}>
            <Avatar name={p.name} tone={p.risk} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{p.name}</p>
              <p className="text-sm text-ink-soft">
                {t('patient.record')}: {p.mrn}
              </p>
            </div>
            <RiskBadge level={p.risk} pct={p.riskPct} />
            <div className="flex flex-wrap gap-2">
              {canOpen(user!.role, 'risk') && (
                <LinkButton href={`/risk?patient=${p.id}`} variant="primary" icon={<HeartPulse size={18} />}>
                  {t('nav.risk')}
                </LinkButton>
              )}
              {canOpen(user!.role, 'care') && (
                <LinkButton href={`/clinical-support?patient=${p.id}`} icon={<Stethoscope size={18} />}>
                  {t('nav.care')}
                </LinkButton>
              )}
            </div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-5">
            <div className={`${CARD} p-6 lg:col-span-2`}>
              <p className="mb-4 text-center text-sm font-semibold text-ink-soft">{t('risk.chance', { days: 30 })}</p>
              <RiskGauge pct={p.riskPct} level={p.risk} />
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
              {[
                [t('patient.record'), p.mrn],
                [t('patient.age'), orDash(p.ageGroup)],
                [t('patient.gender'), orDash(p.gender)],
                [t('patient.illness'), orDash(p.illness)],
              ].map(([k, v]) => (
                <div key={k} className={`${CARD} p-5`}>
                  <dt className="text-sm font-medium text-ink-soft">{k}</dt>
                  <dd className="mt-1 text-xl font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Section title={t('patient.visits')} id="visits">
            {p.visits.length === 0 ? (
              <p className="text-base text-ink-soft">{t('patient.none')}</p>
            ) : (
              <SimpleTable
                caption={t('patient.visits')}
                headers={['#', t('stat.avgStay'), t('stat.cameBack')]}
                rows={[...p.visits]
                  .reverse()
                  .map((v, i) => [
                    v.admittedOn ?? String(p.visits.length - i),
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
