'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  AXIS_TICK,
  FIGURE_CLASS,
  GRID_PROPS,
  PALETTE,
  TOOLTIP_CURSOR,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from './chartUtils';

/**
 * Splits the scored cohort by the fixed 0.50 threshold on the readmission score.
 * `predicted` is the count at or above it; the rest of `total` is below it.
 */
export default function ForecastChart({ predicted, total }: { predicted: number; total: number }) {
  const data = [
    { name: 'At or above 0.50', value: predicted },
    { name: 'Below 0.50', value: Math.max(total - predicted, 0) },
  ];
  return (
    <div className={FIGURE_CLASS} style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} stroke="currentColor" strokeOpacity={0.3} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} stroke="currentColor" strokeOpacity={0.3} width={36} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={TOOLTIP_CURSOR} />
          <Bar dataKey="value" name="Patients" fill={PALETTE[0]} radius={[4, 4, 0, 0]} maxBarSize={72} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
