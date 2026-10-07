'use client';
/**
 * Hospital report (/analytics) — Milestone 3 "healthcare analytics dashboard".
 *
 * 1. four headline numbers   2. patients by risk level (chart + table)
 * 3. return rate by how patients left hospital (chart + table)   4. CSV download
 * Data: GET /analytics/summary + /analytics/readmissions.
 * Note: the backend groups readmissions by discharge type (not by month), so
 * that is what we chart — we do not invent a monthly trend.
 */
import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { BarChartA11y } from '@/saral/BarChartA11y';
import { downloadCsv, toCsv } from '@/saral/csv';
import { Button, LoadState, PageHeader, Section, Stat, StatGrid } from '@/saral/ui';
import { useData } from '@/saral/useData';
import { BedDouble, CalendarCheck, Download, RotateCcw, Users } from 'lucide-react';
import { DonutChartA11y } from '@/saral/DonutChartA11y';

export default function AnalyticsPage() {
  return (
    <AppShell page="analytics">
      <Report />
    </AppShell>
  );
}

function Report() {
  const { t, formatNumber } = useI18n();
  const q = useData(() => data.hospitalReport(), []);
  return (
    <LoadState q={q}>
      {(r) => (
        <>
          <PageHeader title={t('nav.analytics')} help={t('help.analytics')}>
            <Button
              variant="quiet"
              icon={<Download size={18} />}
              onClick={() =>
                downloadCsv(
                  'hospital-report.csv',
                  toCsv(
                    ['discharge', 'visits', 'returned', 'rate_pct'],
                    r.byDischarge.map((d) => [d.label, d.visits, d.returned, d.ratePct]),
                  ),
                )
              }
            >
              {t('common.download')}
            </Button>
          </PageHeader>
          <StatGrid>
            <Stat icon={<Users size={22} />} accent="teal" label={t('stat.patients')} value={formatNumber(r.patients, 0)} />
            <Stat icon={<CalendarCheck size={22} />} accent="blue" label={t('stat.visits')} value={formatNumber(r.visits, 0)} />
            {/* summary counts ANY return (readmitted != 'NO'), not only <30 days → "Returned (%)" */}
            <Stat
              icon={<RotateCcw size={22} />}
              accent="violet"
              label={t('treatment.cameBack')}
              value={`${formatNumber(r.returnRatePct)}%`}
            />
            <Stat icon={<BedDouble size={22} />} accent="teal" label={t('stat.avgStay')} value={formatNumber(r.avgStayDays)} />
          </StatGrid>
          <Section title={t('analytics.riskMix')} id="mix">
            <DonutChartA11y wide title={t('analytics.riskMix')} counts={r.riskMix} centerLabel={t('stat.patients')} />
          </Section>
          <Section title={t('analytics.byDischarge')} id="discharge">
            {r.byDischarge.length > 0 && (
              <BarChartA11y
                title={t('analytics.byDischarge')}
                valueName={t('treatment.cameBack')}
                unit="%"
                data={r.byDischarge.map((d) => ({
                  label: d.label,
                  value: d.ratePct,
                }))}
              />
            )}
          </Section>
        </>
      )}
    </LoadState>
  );
}
