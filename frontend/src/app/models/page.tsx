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
import { LoadState, PageHeader, Section, SimpleTable } from '@/saral/ui';
import { useData } from '@/saral/useData';

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
            <div className="mb-8 rounded-2xl border-2 border-line bg-paper-raised p-6">
              <p className="text-lg text-ink-soft">{t('models.inUse')}</p>
              <p className="text-3xl font-bold">🤖 {m.activeName}</p>
              <p className="text-lg">{m.status}</p>
            </div>
            <dl className="mb-8 grid gap-4 sm:grid-cols-2">
              {[
                [t('models.accuracy'), m.accuracyPct, 'accuracy'],
                [t('models.recall'), m.recallPct, 'recall'],
                [t('models.precision'), m.precisionPct, 'precision'],
                [t('models.overall'), m.qualityPct, 'ROC-AUC'],
              ].map(([label, v, tech]) => (
                <div key={String(tech)} className="rounded-2xl border-2 border-line bg-paper-raised p-5">
                  <dt className="text-lg">{label}</dt>
                  <dd className="text-4xl font-bold tabular-nums">{pct(v as number | null)}</dd>
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
