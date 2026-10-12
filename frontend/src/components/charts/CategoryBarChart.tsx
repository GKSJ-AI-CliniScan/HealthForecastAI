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

import {
  AXIS_TICK,
  FIGURE_CLASS,
  GRID_PROPS,
  PALETTE,
  SEMANTIC_COLORS,
  TOOLTIP_CURSOR,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
  axisTick,
  formatValue,
  type ValueFormat,
} from './chartUtils';

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
    return <p className="py-6 text-center text-sm text-ink-muted">No data to chart.</p>;
  }
  const chartHeight = height ?? (horizontal ? Math.max(160, data.length * 32 + 40) : 240);
  const tick = axisTick(valueFormat);
  const fill = (name: string, index: number) =>
    color ?? SEMANTIC_COLORS[name] ?? PALETTE[index % PALETTE.length];

  return (
    <figure role="img" aria-label={label} className={FIGURE_CLASS} style={{ width: '100%', height: chartHeight }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 16, bottom: 8, left: horizontal ? 8 : 0 }}
        >
          <CartesianGrid {...GRID_PROPS} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={tick} tick={AXIS_TICK} stroke="currentColor" strokeOpacity={0.3} />
              <YAxis type="category" dataKey="name" width={150} tick={AXIS_TICK} stroke="currentColor" strokeOpacity={0.3} />
            </>
          ) : (
            <>
              {/* Labels that would collide are skipped; every bar keeps its name in the tooltip. */}
              <XAxis dataKey="name" tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={8} stroke="currentColor" strokeOpacity={0.3} />
              <YAxis
                tickFormatter={tick}
                tick={AXIS_TICK}
                allowDecimals={valueFormat !== 'number'}
                stroke="currentColor"
                strokeOpacity={0.3}
                width={48}
              />
            </>
          )}
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={TOOLTIP_CURSOR}
            formatter={(value) => formatValue(value, valueFormat)}
          />
          <Bar dataKey="value" name={label} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={44}>
            {data.map((datum, index) => (
              <Cell key={datum.name} fill={fill(datum.name, index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
