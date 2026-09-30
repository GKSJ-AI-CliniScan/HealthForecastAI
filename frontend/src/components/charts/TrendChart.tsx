'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendPoint } from '@/types';

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TrendPoint;
}

/** A p-chart: the rate per cohort against its 3-sigma control limits. */
export function TrendChart({ points, centre }: { points: TrendPoint[]; centre: number }) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const min = Math.max(0, Math.min(...points.map((p) => p.lower_limit)) - 0.01);
  const max = Math.max(...points.map((p) => p.upper_limit)) + 0.01;

  return (
    <div
      style={{ width: '100%', height: 300 }}
      role="img"
      aria-label="Readmission rate control chart"
    >
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="cohort"
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            stroke="var(--border)"
          />
          <YAxis
            domain={[min, max]}
            tickFormatter={pct}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            stroke="var(--border)"
            width={56}
          />
          <Tooltip
            formatter={(v) => pct(Number(v))}
            labelFormatter={(l) => `Cohort ${l}`}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--foreground)',
            }}
          />
          <ReferenceLine y={centre} stroke="var(--muted)" strokeDasharray="4 4" />
          <Line
            dataKey="upper_limit"
            name="Upper limit"
            stroke="#d93025"
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            dataKey="lower_limit"
            name="Lower limit"
            stroke="#d93025"
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            dataKey="rate"
            name="Readmission rate"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={(props: DotProps) => (
              <circle
                key={props.index}
                cx={props.cx}
                cy={props.cy}
                r={props.payload?.out_of_control ? 6 : 3.5}
                fill={props.payload?.out_of_control ? '#d93025' : 'var(--accent)'}
              />
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
