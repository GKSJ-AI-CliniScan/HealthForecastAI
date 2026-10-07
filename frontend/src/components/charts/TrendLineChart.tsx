'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface LineSeriesConfig {
  key: string;
  name: string;
  color: string;
  strokeDasharray?: string;
  strokeWidth?: number;
}

interface TrendLineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: LineSeriesConfig[];

  targetLine?: {
    value: number;
    label: string;
    color?: string;
  };
  asPercent?: boolean;
  height?: number;
}

export function TrendLineChart({
  data,
  xKey,
  series,
  targetLine,
  asPercent = false,
  height = 300,
}: TrendLineChartProps) {

  const formatter = (value: number) =>
    asPercent ? `${(value * 100).toFixed(1)}%` : value.toLocaleString();

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 12, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            stroke="var(--border)"
            tickFormatter={formatter}
            width={56}
          />
          <Tooltip
            formatter={(value, name) => [formatter(Number(value)), name]}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--foreground)',
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="plainline"
          />
          {targetLine && (
            <ReferenceLine
              y={targetLine.value}
              stroke={targetLine.color ?? '#dc2626'}
              strokeDasharray="4 4"
              label={{
                value: targetLine.label,
                fill: targetLine.color ?? '#dc2626',
                fontSize: 11,
                position: 'top',
              }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={s.strokeWidth ?? 2}
              strokeDasharray={s.strokeDasharray}
              dot={{ r: 3, fill: s.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
