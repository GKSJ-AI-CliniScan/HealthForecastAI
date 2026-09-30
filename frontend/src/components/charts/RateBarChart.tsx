'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RateBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  /** Render the y value as a percentage rather than a raw count. */
  asPercent?: boolean;
  height?: number;
}

export function RateBarChart({
  data,
  xKey,
  yKey,
  asPercent = false,
  height = 280,
}: RateBarChartProps) {
  const formatter = (value: number) =>
    asPercent ? `${(value * 100).toFixed(1)}%` : value.toLocaleString();

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
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
            formatter={(value) => formatter(Number(value))}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--foreground)',
            }}
          />
          <Bar dataKey={yKey} fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
