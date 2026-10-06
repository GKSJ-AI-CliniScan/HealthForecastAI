'use client';
/**
 * Home (/dashboard) — Milestone 1 "healthcare dashboard, role-based".
 *
 * Three blocks only, top to bottom:
 *   1. key numbers         GET /patients/stats (+ avg stay if role may see analytics)
 *   2. "what do you want to do?" — one big tile per page this role may open
 *   3. patients who need attention now (high risk) — only for roles that see patients
 * FLOWS NEXT: tiles link to each page; patient names link to /patients/{id}.
 */
import Link from 'next/link';

import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { canOpen, pagesFor } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { AppShell } from '@/saral/AppShell';
import { orDash } from '@/saral/format';
import { LoadState, PageHeader, RiskBadge, Section, Stat, StatGrid } from '@/saral/ui';
import { useData } from '@/saral/useData';

export default function HomePage() {
  return (
    <AppShell page="home">
      <Home />
    </AppShell>
  );
}

function Home() {
  const { t, formatNumber } = useI18n();
  const { user } = useSession();
  const role = user!.role; // AppShell guarantees a user here
  const stats = useData(() => data.homeStats(), []);
  const seesPatients = canOpen(role, 'patients');
  const patients = useData(() => (seesPatients ? data.patients() : Promise.resolve([])), [seesPatients]);

  return (
    <>
      <PageHeader title={t('home.hello', { name: user!.name })} help={`${t(`role.${role}`)} — ${t('help.home')}`} />

      <LoadState q={stats}>
        {(s) => (
          <StatGrid>
            <Stat label={t('stat.patients')} value={formatNumber(s.patients, 0)} />
            <Stat label={t('stat.visits')} value={formatNumber(s.visits, 0)} />
            <Stat label={t('stat.cameBack')} value={`${formatNumber(s.returnRatePct)}%`} />
            <Stat label={t('stat.highRisk')} value={formatNumber(s.highRisk, 0)} tone={s.highRisk > 0 ? 'high' : undefined} />
            <Stat label={t('stat.avgStay')} value={orDash(s.avgStayDays === null ? null : formatNumber(s.avgStayDays))} />
          </StatGrid>
        )}
      </LoadState>

      <Section title={t('home.question')} id="tasks">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagesFor(role)
            .filter((p) => p.id !== 'home')
            .map((p) => (
              <li key={p.id}>
                <Link
                  href={p.href}
                  className="flex h-full min-h-[120px] flex-col gap-1 rounded-2xl border-2 border-line bg-paper-raised p-5 hover:border-teal"
                >
                  <span aria-hidden="true" className="text-4xl">
                    {p.icon}
                  </span>
                  <span className="text-xl font-bold text-ink">{t(p.labelKey)}</span>
                  <span className="text-base text-ink-soft">{t(p.helpKey)}</span>
                </Link>
              </li>
            ))}
        </ul>
      </Section>

      {seesPatients && (
        <Section title={t('home.attention')} id="attention">
          <LoadState q={patients}>
            {(rows) => {
              const high = rows.filter((r) => r.risk === 'high').sort((a, b) => b.riskPct - a.riskPct).slice(0, 5);
              if (high.length === 0) return <p className="text-xl text-ink-soft">{t('home.noAttention')}</p>;
              return (
                <ul className="grid gap-3">
                  {high.map((p) => (
                    <li key={p.id}>
                      <Link href={`/patients/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-rhigh bg-paper-raised p-4">
                        <span className="text-xl font-semibold">{p.name}</span>
                        <RiskBadge level={p.risk} pct={p.riskPct} />
                      </Link>
                    </li>
                  ))}
                </ul>
              );
            }}
          </LoadState>
        </Section>
      )}
    </>
  );
}
