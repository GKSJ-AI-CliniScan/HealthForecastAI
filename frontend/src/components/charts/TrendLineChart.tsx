'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

/** Time series: one line per series over an ordered x axis (month, week, date). */
export default function TrendLineChart({
  data,
  xKey,
  series,
  label,
  valueFormat = 'number',
  height = 260,
}: {
  data: ChartRow[];
  xKey: string;
  series: ChartSeries[];
  label: string;
  valueFormat?: ValueFormat;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm opacity-70">No data to chart.</p>;
  }
  return (
    <figure role="img" aria-label={label} style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={axisTick(valueFormat)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatValue(value, valueFormat)} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((entry, index) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={seriesColor(entry, index)}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
