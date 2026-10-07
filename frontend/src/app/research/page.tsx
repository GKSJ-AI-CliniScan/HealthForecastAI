'use client';
/**
 * Research data (/research) — researcher view (anonymised only).
 *
 * 1. privacy note   2. patients by age group (population health)
 * 3. anonymous patient group table + CSV download (research_dataset:export)
 * Data: GET /analytics/population-health + /patients/anonymised.
 * Privacy: anon IDs are generated here (A-0001…), NOT the database id, and the
 * backend's `race` field is dropped in mappers.ts — not needed for this view.
 */
import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { BarChartA11y } from '@/saral/BarChartA11y';
import { downloadCsv, toCsv } from '@/saral/csv';
import { orDash } from '@/saral/format';
import { Button, LoadState, PageHeader, Section, SimpleTable } from '@/saral/ui';
import { useData } from '@/saral/useData';
import { Download, ShieldCheck } from 'lucide-react';

export default function ResearchPage() {
  return (
    <AppShell page="research">
      <Research />
    </AppShell>
  );
}

function Research() {
  const { t } = useI18n();
  const ages = useData(() => data.ageGroups(), []);
  const cohort = useData(() => data.cohort(), []);
  return (
    <>
      <PageHeader title={t('nav.research')} help={t('help.research')} />
      <p className="mb-6 flex items-center gap-3 rounded-2xl border border-teal bg-teal-bg p-4 text-base text-teal-dark">
        <ShieldCheck aria-hidden="true" size={22} />
        {t('research.privacy')}
      </p>

      <Section title={t('research.byAge')} id="ages">
        <LoadState q={ages} isEmpty={(a) => a.length === 0}>
          {(a) => (
            <BarChartA11y
              title={t('research.byAge')}
              valueName={t('stat.patients')}
              data={a.map((x) => ({ label: x.ageGroup, value: x.patients }))}
            />
          )}
        </LoadState>
      </Section>

      <Section title={t('research.group')} id="cohort">
        <LoadState q={cohort} isEmpty={(c) => c.length === 0}>
          {(c) => (
            <>
              <div className="mb-3">
                <Button
                  variant="quiet"
                  icon={<Download size={18} />}
                  onClick={() =>
                    downloadCsv(
                      'anonymous-cohort.csv',
                      toCsv(
                        ['anon_id', 'age_group', 'gender', 'primary_diagnosis'],
                        c.map((r) => [r.anonId, r.ageGroup, r.gender, r.illness]),
                      ),
                    )
                  }
                >
                  {t('common.download')}
                </Button>
              </div>
              <SimpleTable
                caption={t('research.group')}
                headers={[t('research.id'), t('patient.age'), t('patient.gender'), t('patient.illness')]}
                rows={c.slice(0, 200).map((r) => [r.anonId, orDash(r.ageGroup), orDash(r.gender), orDash(r.illness)])}
              />
            </>
          )}
        </LoadState>
      </Section>
    </>
  );
}
