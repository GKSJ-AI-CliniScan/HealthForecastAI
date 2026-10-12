'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { BAND_CUTOFFS, BAND_FILL, BANDS } from './bands';
import {
  AXIS_TICK,
  FIGURE_CLASS,
  GRID_PROPS,
  LEGEND_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
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
 *
 * ``zones`` is for model scores only: it fixes the y axis to 0-1 and shades
 * the LOW / MEDIUM / HIGH bands behind the lines, with the 0.40 and 0.70
 * cut-offs drawn as lines. The plotted values are unchanged.
 */
export default function TrendLineChart({
  data,
  xKey,
  series,
  label,
  valueFormat = 'number',
  height = 260,
  xType = 'category',
  zones = false,
}: {
  data: ChartRow[];
  xKey: string;
  series: ChartSeries[];
  label: string;
  valueFormat?: ValueFormat;
  height?: number;
  xType?: 'category' | 'time';
  zones?: boolean;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-muted">No data to chart.</p>;
  }
  const times = data.map((row) => Number(row[xKey])).filter(Number.isFinite);
  const start = times.length ? Math.min(...times) : 0;
  const end = times.length ? Math.max(...times) : 0;
  const pad = Math.max(1000, (end - start) * 0.03);
  return (
    <figure role="img" aria-label={label} className={FIGURE_CLASS} style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          {zones &&
            BANDS.map((band) => (
              <ReferenceArea
                key={band.key}
                y1={band.from}
                y2={band.to}
                fill={BAND_FILL[band.key]}
                fillOpacity={0.1}
                strokeOpacity={0}
                ifOverflow="hidden"
              />
            ))}
          <CartesianGrid {...GRID_PROPS} vertical={false} />
          {xType === 'time' ? (
            <XAxis
              dataKey={xKey}
              type="number"
              scale="time"
              domain={[(min: number) => min - pad, (max: number) => max + pad]}
              tickFormatter={(value: number) => formatTimeTick(value, start, end)}
              tick={AXIS_TICK}
              tickCount={6}
              minTickGap={16}
              stroke="currentColor"
              strokeOpacity={0.3}
            />
          ) : (
            <XAxis dataKey={xKey} tick={AXIS_TICK} stroke="currentColor" strokeOpacity={0.3} />
          )}
          <YAxis
            tickFormatter={axisTick(valueFormat)}
            tick={AXIS_TICK}
            stroke="currentColor"
            strokeOpacity={0.3}
            width={44}
            {...(zones ? { domain: [0, 1], ticks: [0, BAND_CUTOFFS.medium, BAND_CUTOFFS.high, 1] } : {})}
          />
          {zones &&
            [BAND_CUTOFFS.medium, BAND_CUTOFFS.high].map((cut) => (
              <ReferenceLine
                key={cut}
                y={cut}
                stroke="currentColor"
                strokeOpacity={0.45}
                strokeDasharray="4 4"
              />
            ))}
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value) => formatValue(value, valueFormat)}
            labelFormatter={
              xType === 'time' ? (value) => formatTimeFull(Number(value)) : undefined
            }
          />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} iconType="plainline" />}
          {series.map((entry, index) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={seriesColor(entry, index)}
              strokeWidth={2.25}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
