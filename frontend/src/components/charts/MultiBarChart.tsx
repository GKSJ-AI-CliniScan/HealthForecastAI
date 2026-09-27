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
    return <p className="py-6 text-center text-sm opacity-70">No data to chart.</p>;
  }
  return (
    <figure role="img" aria-label={label} style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={axisTick(valueFormat)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatValue(value, valueFormat)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((entry, index) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.label}
              stackId={stacked ? 'stack' : undefined}
              fill={seriesColor(entry, index)}
              radius={stacked ? 0 : 4}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
