'use client';
/**
 * BarChartA11y.tsx — a bar chart that blind users can also "see".
 *
 * WHY: a picture of bars means nothing to a screen reader. So:
 *   1. the chart is wrapped in role="img" with a one-sentence summary
 *      ("Return rate: highest Home 14%, lowest Transfer 6%")
 *   2. a button switches to a real data table (same numbers, read row by row)
 *   3. with "reduce movement" on, bars do not animate
 * Only bar charts are used: they are the easiest chart for non-technical users.
 * FLOWS NEXT: used by analytics, treatment and research pages.
 */
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useA11y } from '@/a11y/A11yProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { BarChart3, Table2 } from 'lucide-react';

import { chartColors } from './chartTheme';
import { Button, SimpleTable } from './ui';

export interface BarDatum {
  label: string;
  value: number;
}

export function BarChartA11y({ title, data, unit = '', valueName }: { title: string; data: BarDatum[]; unit?: string; valueName: string }) {
  const { t, formatNumber } = useI18n();
  const { settings } = useA11y();
  const [asTable, setAsTable] = useState(false);
  const fmt = (v: number) => `${formatNumber(v)}${unit}`;
  const c = chartColors(settings); // real colours: SVG attributes can't read CSS vars

  // Spoken summary: highest and lowest bar, in the user's language format.
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const summary =
    sorted.length > 0
      ? t('common.chartSummary', {
          name: title,
          first: `${sorted[0].label} ${fmt(sorted[0].value)}`,
          last: `${sorted[sorted.length - 1].label} ${fmt(sorted[sorted.length - 1].value)}`,
        })
      : title;

  return (
    <figure>
      {/* Usually sits inside a <Section> card, so the figure itself has no border. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm font-semibold text-ink-soft">{title}</figcaption>
        <Button variant="quiet" icon={asTable ? <BarChart3 size={18} /> : <Table2 size={18} />} onClick={() => setAsTable((v) => !v)}>
          {asTable ? t('common.showChart') : t('common.showTable')}
        </Button>
      </div>
      {asTable ? (
        <SimpleTable caption={title} headers={['', valueName]} rows={data.map((d) => [d.label, fmt(d.value)])} />
      ) : (
        <div role="img" aria-label={summary} className="h-72 w-full" data-no-read>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 13 }} interval={0} height={60} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: c.tick, fontSize: 13 }} width={48} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: c.track }} formatter={(v) => fmt(Number(v))} />
              <Bar
                dataKey="value"
                name={valueName}
                fill={c.bar}
                radius={[8, 8, 0, 0]}
                maxBarSize={64}
                isAnimationActive={!settings.reduceMotion}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* The summary is also visible text, so "Read aloud" includes it. */}
      <p className="mt-2 text-sm text-ink-soft">{summary}</p>
    </figure>
  );
}
