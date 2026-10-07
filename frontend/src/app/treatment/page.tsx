'use client';
/**
 * Treatment results (/treatment) — Milestone 3 "treatment effectiveness".
 *
 * 1. "Best recovery" — the single treatment with the highest recovery score
 * 2. bar chart of recovery score per treatment (with table toggle)
 * 3. full table: patients, recovery score, % returned, average days in hospital
 * Data: GET /treatment + /treatment/recovery-trends (avg stay per treatment).
 */
import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { BarChartA11y } from '@/saral/BarChartA11y';
import { orDash } from '@/saral/format';
import { LoadState, PageHeader, Section, SimpleTable } from '@/saral/ui';
import { useData } from '@/saral/useData';
import { Trophy } from 'lucide-react';

export default function TreatmentPage() {
  return (
    <AppShell page="treatment">
      <Treatments />
    </AppShell>
  );
}

function Treatments() {
  const { t, formatNumber } = useI18n();
  const q = useData(() => data.treatments(), []);
  return (
    <>
      <PageHeader title={t('nav.treatment')} help={t('help.treatment')} />
      <LoadState q={q} isEmpty={(rows) => rows.length === 0}>
        {(rows) => {
          const best = [...rows].sort((a, b) => b.recoveryScore - a.recoveryScore)[0];
          return (
            <>
              <div className="mb-6 flex items-center gap-4 rounded-2xl border border-rlow bg-rlow-bg p-6 text-rlow">
                <Trophy aria-hidden="true" size={36} className="shrink-0" />
                <div>
                  <p className="text-lg">{t('treatment.best')}</p>
                  <p className="mt-1 text-2xl font-bold">{best.name}</p>
                  <p className="text-base">
                    {t('treatment.recovery')}: {formatNumber(best.recoveryScore)}
                  </p>
                </div>
              </div>
              <Section title={t('treatment.recovery')} id="chart">
                <BarChartA11y
                  title={t('treatment.recovery')}
                  valueName={t('treatment.recovery')}
                  data={rows.map((r) => ({
                    label: r.name,
                    value: r.recoveryScore,
                  }))}
                />
              </Section>
              <Section title={t('nav.treatment')} id="table">
                <SimpleTable
                  caption={t('nav.treatment')}
                  headers={[
                    t('treatment.name'),
                    t('treatment.patients'),
                    t('treatment.recovery'),
                    t('treatment.cameBack'),
                    t('stat.avgStay'),
                  ]}
                  rows={rows.map((r) => [
                    r.name,
                    formatNumber(r.patients, 0),
                    formatNumber(r.recoveryScore),
                    `${formatNumber(r.returnRatePct)}%`,
                    orDash(r.avgStayDays === null ? null : formatNumber(r.avgStayDays)),
                  ])}
                />
              </Section>
            </>
          );
        }}
      </LoadState>
    </>
  );
}
