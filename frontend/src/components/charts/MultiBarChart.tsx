'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  AXIS_TICK,
  FIGURE_CLASS,
  GRID_PROPS,
  LEGEND_STYLE,
  TOOLTIP_CURSOR,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
  axisTick,
  formatValue,
  seriesColor,
  type ChartRow,
  type ChartSeries,
  type ValueFormat,
} from './chartUtils';

/**
 * Several values per category: stacked (a breakdown such as outcomes per
 * treatment or risk categories per month) or grouped (side-by-side rates).
 */
export default function MultiBarChart({
  data,
  xKey,
  series,
  label,
  stacked = false,
  valueFormat = 'number',
  height = 260,
}: {
  data: ChartRow[];
  xKey: string;
  series: ChartSeries[];
  label: string;
  stacked?: boolean;
  valueFormat?: ValueFormat;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-muted">No data to chart.</p>;
  }
  return (
    <figure role="img" aria-label={label} className={FIGURE_CLASS} style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} stroke="currentColor" strokeOpacity={0.3} />
          <YAxis
            tickFormatter={axisTick(valueFormat)}
            tick={AXIS_TICK}
            stroke="currentColor"
            strokeOpacity={0.3}
            width={48}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={TOOLTIP_CURSOR}
            formatter={(value) => formatValue(value, valueFormat)}
          />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="square" />
          {series.map((entry, index) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.label}
              stackId={stacked ? 'stack' : undefined}
              fill={seriesColor(entry, index)}
              radius={stacked ? 0 : [4, 4, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
