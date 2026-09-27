'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { axisTick, formatValue, PALETTE, SEMANTIC_COLORS, type ValueFormat } from './chartUtils';

export interface CategoryDatum {
  name: string;
  value: number;
}

/**
 * One bar per category - distributions, department comparisons, rates.
 * Horizontal layout suits long category names (diagnoses, departments).
 */
export default function CategoryBarChart({
  data,
  label,
  valueFormat = 'number',
  horizontal = false,
  height,
  color,
}: {
  data: CategoryDatum[];
  label: string;
  valueFormat?: ValueFormat;
  horizontal?: boolean;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm opacity-70">No data to chart.</p>;
  }
  const chartHeight = height ?? (horizontal ? Math.max(160, data.length * 32 + 40) : 240);
  const tick = axisTick(valueFormat);
  const fill = (name: string, index: number) =>
    color ?? SEMANTIC_COLORS[name] ?? PALETTE[index % PALETTE.length];

  return (
    <figure role="img" aria-label={label} style={{ width: '100%', height: chartHeight }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 16, bottom: 8, left: horizontal ? 8 : 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={tick} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tickFormatter={tick} tick={{ fontSize: 11 }} allowDecimals={valueFormat !== 'number'} />
            </>
          )}
          <Tooltip formatter={(value) => formatValue(value, valueFormat)} />
          <Bar dataKey="value" name={label} radius={4}>
            {data.map((datum, index) => (
              <Cell key={datum.name} fill={fill(datum.name, index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
