'use client';
/**
 * AI model (/models) — Milestone 4 "AI model management" (system admin only).
 *
 * Technical metrics are renamed into questions a non-technical person can read:
 *   accuracy  → "How often the AI is right"
 *   recall    → "How many at-risk patients it finds"
 *   precision → "When it says high risk, how often it is right"
 *   ROC-AUC   → "Overall quality score"
 * Each still shows its technical name in small text for the experts.
 * Data: GET /models/active, /models/metrics, /models.
 */
import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { orDash } from '@/saral/format';
import { CARD, IconChip, LoadState, PageHeader, Section, SimpleTable } from '@/saral/ui';
import { useData } from '@/saral/useData';
import { Bot } from 'lucide-react';

export default function ModelsPage() {
  return (
    <AppShell page="models">
      <Models />
    </AppShell>
  );
}

function Models() {
  const { t, formatNumber } = useI18n();
  const q = useData(() => data.model(), []);
  const pct = (v: number | null) => orDash(v === null ? null : `${formatNumber(v)}%`);
  return (
    <>
      <PageHeader title={t('nav.models')} help={t('help.models')} />
      <LoadState q={q}>
        {(m) => (
          <>
            <div className={`${CARD} mb-6 flex items-center gap-4 p-6`}>
              <IconChip icon={<Bot size={26} />} size="lg" />
              <div>
                <p className="text-sm text-ink-soft">{t('models.inUse')}</p>
                <p className="text-2xl font-bold">{m.activeName}</p>
                <p className="text-sm text-ink-soft">{m.status}</p>
              </div>
            </div>
            <dl className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [t('models.accuracy'), m.accuracyPct, 'accuracy'],
                [t('models.recall'), m.recallPct, 'recall'],
                [t('models.precision'), m.precisionPct, 'precision'],
                [t('models.overall'), m.qualityPct, 'ROC-AUC'],
              ].map(([label, v, tech]) => (
                <div key={String(tech)} className={`${CARD} p-5`}>
                  <dt className="text-sm font-medium text-ink-soft">{label}</dt>
                  <dd className="mt-1 text-3xl font-bold tabular-nums">{pct(v as number | null)}</dd>
                  <dd className="text-sm text-ink-soft">{t('models.technical', { name: String(tech) })}</dd>
                </div>
              ))}
            </dl>
            <Section title={t('models.all')} id="all">
              {m.all.length > 0 && (
                <SimpleTable
                  caption={t('models.all')}
                  headers={[t('nav.models'), t('models.version'), t('models.trainedOn'), t('models.overall')]}
                  rows={m.all.map((x) => [x.name, x.version, orDash(x.trainedOn), pct(x.qualityPct)])}
                />
              )}
            </Section>
          </>
        )}
      </LoadState>
    </>
  );
}
