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
  formatTimeFull,
  formatTimeTick,
  formatValue,
  seriesColor,
  type ChartRow,
  type ChartSeries,
  type ValueFormat,
} from './chartUtils';

/**
 * Time series: one line per series over an ordered x axis. ``xType="time"``
 * expects epoch-ms x values and plots them on a true time scale, so
 * timestamps close together stay distinct instead of collapsing onto
 * identical category labels.
 */
export default function TrendLineChart({
  data,
  xKey,
  series,
  label,
  valueFormat = 'number',
  height = 260,
  xType = 'category',
}: {
  data: ChartRow[];
  xKey: string;
  series: ChartSeries[];
  label: string;
  valueFormat?: ValueFormat;
  height?: number;
  xType?: 'category' | 'time';
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm opacity-70">No data to chart.</p>;
  }
  const times = data.map((row) => Number(row[xKey])).filter(Number.isFinite);
  const start = times.length ? Math.min(...times) : 0;
  const end = times.length ? Math.max(...times) : 0;
  const pad = Math.max(1000, (end - start) * 0.03);
  return (
    <figure role="img" aria-label={label} style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          {xType === 'time' ? (
            <XAxis
              dataKey={xKey}
              type="number"
              scale="time"
              domain={[(min: number) => min - pad, (max: number) => max + pad]}
              tickFormatter={(value: number) => formatTimeTick(value, start, end)}
              tick={{ fontSize: 11 }}
              tickCount={6}
              minTickGap={16}
            />
          ) : (
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          )}
          <YAxis tickFormatter={axisTick(valueFormat)} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => formatValue(value, valueFormat)}
            labelFormatter={
              xType === 'time' ? (value) => formatTimeFull(Number(value)) : undefined
            }
          />
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
