'use client';
/**
 * Forecast (/forecast) — Milestone 2 "readmission forecasting".
 *
 * One choice (time period: 30/60/90/180/365 days as big buttons) and two numbers:
 * patients expected to return, and expected rate next to today's rate.
 * Data: GET /risk/forecast?horizon_days=N (+ /patients/stats for "rate now").
 * HONESTY: the backend forecast is still a TODO stub returning zeros. Then we
 * say "The server has no data for this yet" instead of showing 0 as a forecast.
 */
import { useState } from 'react';

import { data } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/saral/AppShell';
import { Button, Empty, LoadState, PageHeader, Stat, StatGrid } from '@/saral/ui';
import { useData } from '@/saral/useData';

const PERIODS = [30, 60, 90, 180, 365];

export default function ForecastPage() {
  return (
    <AppShell page="forecast">
      <ForecastView />
    </AppShell>
  );
}

function ForecastView() {
  const { t, formatNumber } = useI18n();
  const [days, setDays] = useState(30);
  const forecast = useData(() => data.forecast(days), [days]);
  const now = useData(() => data.homeStats(), []);

  return (
    <>
      <PageHeader title={t('nav.forecast')} help={t('help.forecast')} />
      <fieldset className="mb-8">
        <legend className="mb-2 text-lg font-semibold">{t('forecast.period')}</legend>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((d) => (
            <Button key={d} variant="quiet" pressed={d === days} onClick={() => setDays(d)}>
              {t('common.days', { n: d })}
            </Button>
          ))}
        </div>
      </fieldset>

      <LoadState q={forecast}>
        {(f) =>
          !f.available ? (
            <Empty />
          ) : (
            <StatGrid>
              <Stat
                label={`${t('forecast.expected')} (${t('common.days', { n: f.horizonDays })})`}
                value={formatNumber(f.expectedReturns, 0)}
              />
              <Stat label={t('forecast.rateNext')} value={`${formatNumber(f.expectedRatePct)}%`} />
              {now.status === 'ok' && <Stat label={t('forecast.rateNow')} value={`${formatNumber(now.data.returnRatePct)}%`} />}
            </StatGrid>
          )
        }
      </LoadState>
    </>
  );
}
