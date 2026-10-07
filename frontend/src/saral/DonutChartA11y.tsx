'use client';
/**
 * DonutChartA11y.tsx — "patients by risk level" as a donut with the total in the middle.
 *
 * Accessible the same way as the bar chart:
 *   - the picture is role="img" with a spoken summary ("High risk 18, Medium 40, Low 62")
 *   - the legend is a real list with numbers AND percentages (never colour alone:
 *     each legend item has the risk icon + word)
 * FLOWS NEXT: Home (for roles that see analytics) and Hospital report.
 */
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { useA11y } from '@/a11y/A11yProvider';
import type { RiskLevel } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { chartColors } from './chartTheme';
import { RiskBadge } from './ui';

const ORDER: RiskLevel[] = ['high', 'medium', 'low'];

/** wide = the card spans the full page (chart left, legend right); otherwise it may sit in a
 *  narrow column on desktop, so chart and legend stack there. */
export function DonutChartA11y({
  title,
  counts,
  centerLabel,
  wide = false,
}: {
  title: string;
  counts: Record<RiskLevel, number>;
  centerLabel: string;
  wide?: boolean;
}) {
  const { t, formatNumber } = useI18n();
  const { settings } = useA11y();
  const c = chartColors(settings);
  const total = ORDER.reduce((n, k) => n + counts[k], 0);
  const data = ORDER.map((k) => ({ key: k, value: counts[k] }));
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const summary = `${title}: ${ORDER.map((k) => `${t(`risk.${k}`)} ${formatNumber(counts[k], 0)}`).join(', ')}`;

  return (
    <figure
      className={`grid items-center gap-6 sm:grid-cols-[200px_1fr] ${wide ? '[&>ul]:max-w-sm' : 'lg:grid-cols-1 2xl:grid-cols-[200px_1fr]'}`}
    >
      <figcaption className="sr-only">{title}</figcaption>
      <div role="img" aria-label={summary} className="relative mx-auto h-[200px] w-[200px]" data-no-read>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total ? data : [{ key: 'none', value: 1 }]}
              dataKey="value"
              innerRadius={68}
              outerRadius={96}
              paddingAngle={total ? 2 : 0}
              stroke="none"
              isAnimationActive={!settings.reduceMotion}
            >
              {(total ? data : [{ key: 'none' }]).map((d) => (
                <Cell key={d.key} fill={d.key === 'none' ? c.track : c.risk[d.key as RiskLevel]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-3xl font-bold tabular-nums text-ink">{formatNumber(total, 0)}</span>
          <span className="text-xs text-ink-soft">{centerLabel}</span>
        </div>
      </div>
      <ul className="space-y-3">
        {ORDER.map((k) => (
          <li key={k} className="flex items-center justify-between gap-3">
            <RiskBadge level={k} />
            <span className="tabular-nums text-ink">
              <strong className="text-lg">{formatNumber(counts[k], 0)}</strong>
              <span className="ml-2 text-sm text-ink-soft">{pct(counts[k])}%</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
