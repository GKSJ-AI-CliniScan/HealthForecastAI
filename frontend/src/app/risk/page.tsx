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
import { RiskGauge } from '@/saral/RiskGauge';
import { Button, CARD, LoadState, PageHeader, Section } from '@/saral/ui';
import { RotateCw } from 'lucide-react';
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
            <div aria-live="polite" className={`${CARD} mb-6 p-6 text-center`}>
              <p className="text-lg font-semibold">{p.name}</p>
              <p className="mt-1 text-sm text-ink-soft">{t('risk.chance', { days: 30 })}</p>
              {/* sr-only sentence: the gauge is a picture, this is what screen readers hear */}
              <p className="sr-only">{`${formatNumber(pct, 0)}%`}</p>
              <div className="my-4">
                <RiskGauge pct={pct} level={level} />
              </div>
              {fresh && <p className="mb-3 text-sm text-ink-soft">{t('models.technical', { name: fresh.modelName })}</p>}
              <div className="mt-5">
                <Button
                  disabled={busy}
                  icon={<RotateCw size={18} />}
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
                  <p role="alert" className="mt-3 text-base font-semibold text-rhigh">
                    {err}
                  </p>
                )}
              </div>
            </div>

            <Section title={t('risk.todo')} id="todo">
              <LoadState q={advice} isEmpty={(a) => a.actions.length === 0}>
                {(a) => (
                  <ol className="list-decimal space-y-2 pl-6 text-base marker:font-semibold marker:text-teal">
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
