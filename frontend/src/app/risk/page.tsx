'use client';
/**
 * Risk check (/risk) — Milestone 2 "risk prediction dashboard".
 *
 * Flow for the user: choose patient → see the latest risk → press "Check risk"
 * to run the AI model again (POST /risk/predict, saved by the backend) → see the
 * new number, plus "What to do" from clinical support.
 * The big number is also written as a sentence so a screen reader says it
 * meaningfully ("Chance of returning to hospital within 30 days: 72%").
 * The result region is aria-live, so a blind user hears the new result.
 */
import { useEffect, useState } from 'react';

import { ApiError, data, type RiskResult } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { PatientPicker, patientFromUrl } from '@/saral/PatientPicker';
import { Button, LoadState, PageHeader, RiskBadge, Section } from '@/saral/ui';
import { useData } from '@/saral/useData';

export default function RiskPage() {
  return (
    <AppShell page="risk">
      <Risk />
    </AppShell>
  );
}

function Risk() {
  const { t } = useI18n();
  const [id, setId] = useState<number | null>(null);
  useEffect(() => setId(patientFromUrl()), []);

  return (
    <>
      <PageHeader title={t('nav.risk')} help={t('help.risk')} />
      <PatientPicker value={id} onChange={setId} />
      {id !== null && <RiskFor key={id} id={id} />}
    </>
  );
}

function RiskFor({ id }: { id: number }) {
  const { t, formatNumber } = useI18n();
  const patient = useData(() => data.patient(id), [id]);
  const advice = useData(() => data.careAdvice(id), [id]);
  const [fresh, setFresh] = useState<RiskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <LoadState q={patient}>
      {(p) => {
        const pct = fresh?.riskPct ?? p.riskPct;
        const level = fresh?.risk ?? p.risk;
        return (
          <>
            <div aria-live="polite" className="mb-8 rounded-2xl border-2 border-line bg-paper-raised p-6">
              <p className="text-xl font-semibold">{p.name}</p>
              <p className="mt-2 text-lg text-ink-soft">{t('risk.chance', { days: 30 })}</p>
              <p className="my-2 text-7xl font-bold tabular-nums">{formatNumber(pct, 0)}%</p>
              <RiskBadge level={level} />
              {fresh && (
                <p className="mt-3 text-base text-ink-soft">{t('models.technical', { name: fresh.modelName })}</p>
              )}
              <div className="mt-5">
                <Button
                  disabled={busy}
                  icon="↻"
                  onClick={async () => {
                    setBusy(true);
                    setErr(null);
                    try {
                      setFresh(await data.checkRisk(p));
                    } catch (e) {
                      setErr(e instanceof ApiError && e.kind === 'offline' ? t('common.offline') : t('common.error'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? t('common.loading') : t('risk.calculate')}
                </Button>
                {err && (
                  <p role="alert" className="mt-3 text-lg font-semibold text-rhigh">
                    {err}
                  </p>
                )}
              </div>
            </div>

            <Section title={t('risk.todo')} id="todo">
              <LoadState q={advice} isEmpty={(a) => a.actions.length === 0}>
                {(a) => (
                  <ol className="list-decimal space-y-2 pl-6 text-xl">
                    {a.actions.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ol>
                )}
              </LoadState>
            </Section>
          </>
        );
      }}
    </LoadState>
  );
}
