'use client';
/**
 * Home (/dashboard) — Milestone 1 "healthcare dashboard, role-based".
 *
 * v2 layout (still one glance, now looks like a real product):
 *   1. welcome banner: "Hello, <name>", role, today's date, Read aloud
 *   2. KPI cards with icons        GET /patients/stats (+ avg stay if role may see analytics)
 *   3. left:  patients who need attention now (doctor/admin/sysadmin)  GET /patients
 *      right: patients by risk level (donut)
 *             roles that see patients → counted from the same patient list (numbers agree)
 *             researcher → /analytics/summary risk distribution (he may not list patients)
 *   4. quick actions: one tile per page this role may open
 * FLOWS NEXT: tiles link to each page; patient rows link to /patients/{id}.
 */
import Link from 'next/link';
import { AlertTriangle, CalendarCheck, ChevronRight, RotateCcw, Users, Volume2 } from 'lucide-react';

import { useA11y } from '@/a11y/A11yProvider';
import { data, type PatientRow, type RiskLevel } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { canOpen, pagesFor } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { AppShell } from '@/saral/AppShell';
import { DonutChartA11y } from '@/saral/DonutChartA11y';
import { orDash } from '@/saral/format';
import { PAGE_ICON } from '@/saral/icons';
import { Avatar, IconChip, LoadState, RiskBadge, RiskBar, Section, Stat, StatGrid } from '@/saral/ui';
import { useData } from '@/saral/useData';

export default function HomePage() {
  return (
    <AppShell page="home">
      <Home />
    </AppShell>
  );
}

function countRisk(rows: PatientRow[]): Record<RiskLevel, number> {
  const c = { high: 0, medium: 0, low: 0 };
  rows.forEach((r) => c[r.risk]++);
  return c;
}

function Home() {
  const { t, formatNumber, lang } = useI18n();
  const { readPage } = useA11y();
  const { user } = useSession();
  const role = user!.role; // AppShell guarantees a user here
  const stats = useData(() => data.homeStats(), []);
  const seesPatients = canOpen(role, 'patients');
  const seesReport = canOpen(role, 'analytics');
  const patients = useData(() => (seesPatients ? data.patients() : Promise.resolve([])), [seesPatients]);
  const report = useData(() => (seesReport ? data.hospitalReport() : Promise.reject(new Error('n/a'))), [seesReport]);
  const today = new Date().toLocaleDateString(`${lang}-IN`, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  });

  return (
    <>
      {/* 1. Welcome banner — holds the page's only <h1>. */}
      <header className="bg-hero mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 text-white shadow-card sm:p-8">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">{today}</p>
          <h1 tabIndex={-1} className="mt-1 text-2xl font-bold tracking-tight outline-none sm:text-3xl">
            {t('home.hello', { name: user!.name })}
          </h1>
          <p data-page-help className="mt-1.5 max-w-prose text-base text-white/90">
            {t(`role.${role}`)} — {t('help.home')}
          </p>
        </div>
        <button
          type="button"
          onClick={readPage}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 font-semibold text-white hover:bg-white/20"
        >
          <Volume2 aria-hidden="true" size={18} />
          {t('a11y.read')}
        </button>
      </header>

      {/* 2. Key numbers */}
      <LoadState q={stats}>
        {(s) => (
          <StatGrid>
            <Stat icon={<Users size={22} />} accent="teal" label={t('stat.patients')} value={formatNumber(s.patients, 0)} />
            <Stat
              icon={<CalendarCheck size={22} />}
              accent="blue"
              label={t('stat.visits')}
              value={formatNumber(s.visits, 0)}
              note={s.avgStayDays === null ? undefined : `${t('stat.avgStay')}: ${formatNumber(s.avgStayDays)}`}
            />
            <Stat icon={<RotateCcw size={22} />} accent="violet" label={t('stat.cameBack')} value={`${formatNumber(s.returnRatePct)}%`} />
            <Stat
              icon={<AlertTriangle size={22} />}
              label={t('stat.highRisk')}
              value={formatNumber(s.highRisk, 0)}
              tone={s.highRisk > 0 ? 'high' : undefined}
              accent="low"
            />
          </StatGrid>
        )}
      </LoadState>

      {/* 3. Attention list + risk donut */}
      <div className="grid gap-6 lg:grid-cols-5">
        {seesPatients && (
          <div className="lg:col-span-3">
            <Section title={t('home.attention')} id="attention">
              <LoadState q={patients}>
                {(rows) => {
                  const high = rows
                    .filter((r) => r.risk === 'high')
                    .sort((a, b) => b.riskPct - a.riskPct)
                    .slice(0, 6);
                  if (high.length === 0) return <p className="text-base text-ink-soft">{t('home.noAttention')}</p>;
                  return (
                    <ul className="divide-y divide-line">
                      {high.map((p) => (
                        <li key={p.id}>
                          <Link href={`/patients/${p.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-paper">
                            <Avatar name={p.name} tone="high" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-ink">{p.name}</span>
                              <span className="block truncate text-sm text-ink-soft">
                                {p.mrn} · {orDash(p.illness)}
                              </span>
                              {/* phones: badge under the name (no room beside it) */}
                              <span className="mt-1 block sm:hidden">
                                <RiskBadge level={p.risk} pct={p.riskPct} />
                              </span>
                            </span>
                            <span className="hidden sm:block">
                              <RiskBar level={p.risk} pct={p.riskPct} />
                            </span>
                            <ChevronRight aria-hidden="true" size={18} className="text-ink-soft" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  );
                }}
              </LoadState>
            </Section>
          </div>
        )}

        {(seesReport || seesPatients) && (
          <div className={seesPatients ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Section title={t('analytics.riskMix')} id="mix">
              {/* Same source as the attention list when the role sees patients, so the numbers agree.
                  (/analytics/summary counts only patients that already have a saved prediction.) */}
              {seesPatients ? (
                <LoadState q={patients}>
                  {(rows) => <DonutChartA11y title={t('analytics.riskMix')} counts={countRisk(rows)} centerLabel={t('stat.patients')} />}
                </LoadState>
              ) : (
                <LoadState q={report}>
                  {(r) => <DonutChartA11y title={t('analytics.riskMix')} counts={r.riskMix} centerLabel={t('stat.patients')} />}
                </LoadState>
              )}
            </Section>
          </div>
        )}

        {/* 4. Quick actions */}
        <div className={seesPatients ? 'lg:col-span-5' : 'lg:col-span-2'}>
          <Section title={t('home.question')} id="tasks">
            <ul className={`grid gap-3 ${seesPatients ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>
              {pagesFor(role)
                .filter((p) => p.id !== 'home')
                .map((p) => {
                  const Icon = PAGE_ICON[p.id];
                  return (
                    <li key={p.id}>
                      <Link
                        href={p.href}
                        className="group flex h-full items-center gap-4 rounded-2xl border border-line p-4 transition-colors hover:border-teal hover:bg-teal-bg"
                      >
                        <IconChip icon={<Icon size={22} />} accent="teal" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{t(p.labelKey)}</span>
                          <span className="block text-sm text-ink-soft">{t(p.helpKey)}</span>
                        </span>
                        <ChevronRight aria-hidden="true" size={18} className="text-ink-soft group-hover:text-teal" />
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
