'use client';
/**
 * Care advice (/clinical-support) — Milestone 3 "clinical decision support".
 *
 * For one patient, three plain answers:
 *   1. Ready to go home?  big ✓ / ✗ with readiness %
 *   2. Recommended actions (numbered — a real sequence of steps)
 *   3. Instructions after going home + follow-up visit
 * Data: GET /clinical-support/recommendations/{id} and /discharge-plan/{id}.
 * Advice text comes from the backend in English (we cannot translate free
 * text safely); the labels around it are translated.
 * Printing (browser's own Print) shows only this content — see @media print in globals.css.
 */
import { useEffect, useState } from 'react';

import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { PatientPicker, patientFromUrl } from '@/saral/PatientPicker';
import { Empty, LoadState, PageHeader, Section } from '@/saral/ui';
import { useData } from '@/saral/useData';

export default function CarePage() {
  return (
    <AppShell page="care">
      <Care />
    </AppShell>
  );
}

function Care() {
  const { t } = useI18n();
  const [id, setId] = useState<number | null>(null);
  useEffect(() => setId(patientFromUrl()), []);
  return (
    <>
      <PageHeader title={t('nav.care')} help={t('help.care')} />
      <PatientPicker value={id} onChange={setId} />
      {id !== null && <AdviceFor key={id} id={id} />}
    </>
  );
}

function AdviceFor({ id }: { id: number }) {
  const { t, formatNumber } = useI18n();
  const q = useData(() => data.careAdvice(id), [id]);
  return (
    <LoadState q={q}>
      {(a) => (
        <>
          {a.readyToGoHome !== null && (
            <div
              className={`mb-8 rounded-2xl border-2 p-6 ${a.readyToGoHome ? 'border-rlow bg-rlow-bg text-rlow' : 'border-rhigh bg-rhigh-bg text-rhigh'}`}
            >
              <p className="text-lg">{t('care.goHome')}</p>
              <p className="mt-1 text-3xl font-bold">
                <span aria-hidden="true">{a.readyToGoHome ? '✓ ' : '✗ '}</span>
                {a.readyToGoHome ? t('care.ready') : t('care.notReady')}
              </p>
              {a.readinessPct !== null && (
                <p className="mt-2 text-xl">{t('care.readiness', { p: `${formatNumber(a.readinessPct, 0)}%` })}</p>
              )}
            </div>
          )}

          <Section title={t('care.actions')} id="actions">
            {a.actions.length === 0 ? (
              <Empty />
            ) : (
              <ol className="list-decimal space-y-2 pl-6 text-xl">
                {a.actions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            )}
            {a.followUpDays !== null && (
              <p className="mt-4 text-xl font-semibold">📅 {t('care.followUp', { n: a.followUpDays })}</p>
            )}
          </Section>

          <Section title={t('care.afterHome')} id="after">
            {a.afterHomeSteps.length === 0 ? (
              <Empty />
            ) : (
              <ul className="list-disc space-y-2 pl-6 text-xl">
                {a.afterHomeSteps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </LoadState>
  );
}
