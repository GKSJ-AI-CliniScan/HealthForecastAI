'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ForecastDataPoint } from '@/types/forecast';
import { Card } from '@/components/ui/Card';
import {
  TrendingDownIcon,
  ShieldAlertIcon,
  ActivityIcon,
} from '@/components/ui/Icons';

export interface ReadmissionTrendChartProps {
  data: ForecastDataPoint[];
  nationalBenchmark?: number;
  className?: string;
}

export function ReadmissionTrendChart({
  data,
  nationalBenchmark = 8.0,
  className = '',
}: ReadmissionTrendChartProps) {
  const [showConfidenceBand, setShowConfidenceBand] = useState(true);
  const [showBenchmark, setShowBenchmark] = useState(true);

  // Format data for Recharts composed chart
  const formattedData = data.map((d) => ({
    period: d.period,
    actualRate: d.actualRate,
    forecastedRate: d.forecastedRate,
    confidenceRange:
      d.lowerBound !== null && d.upperBound !== null && d.lowerBound !== undefined && d.upperBound !== undefined
        ? [d.lowerBound, d.upperBound]
        : null,
    lowerBound: d.lowerBound,
    upperBound: d.upperBound,
    isForecast: d.isForecast,
    totalAdmissions: d.totalAdmissions,
    predictedReadmissions: d.predictedReadmissions,
  }));

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      value?: number | [number, number];
      dataKey?: string;
      name?: string;
      color?: string;
      payload: (typeof formattedData)[0];
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <div className="rounded-xl border border-warm-border bg-white dark:bg-warm-card p-3.5 shadow-lg dark:border-warm-border text-xs space-y-2 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-warm-border/60 pb-1.5 dark:border-warm-border/60">
          <span className="font-bold text-warm-text dark:text-warm-text">{label}</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
              point.isForecast
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200'
                : 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300'
            }`}
          >
            {point.isForecast ? 'Simulated Forecast' : 'Historical Data'}
          </span>
        </div>

        <div className="space-y-1">
          {point.actualRate !== null && point.actualRate !== undefined && (
            <div className="flex justify-between items-center text-brand-700 dark:text-brand-300">
              <span className="font-medium">Recorded Rate:</span>
              <span className="font-bold font-mono text-sm">{point.actualRate}%</span>
            </div>
          )}

          {point.forecastedRate !== null && point.forecastedRate !== undefined && (
            <div className="flex justify-between items-center text-coral-600 dark:text-coral-400">
              <span className="font-medium">Forecasted Rate:</span>
              <span className="font-bold font-mono text-sm">{point.forecastedRate}%</span>
            </div>
          )}

          {point.lowerBound !== null && point.upperBound !== null && point.lowerBound !== undefined && point.upperBound !== undefined && (
            <div className="flex justify-between items-center text-warm-text-muted text-[11px]">
              <span>95% Confidence Band:</span>
              <span className="font-mono">
                {point.lowerBound}% - {point.upperBound}%
              </span>
            </div>
          )}

          <div className="pt-1.5 border-t border-warm-border/40 text-[11px] text-warm-text-muted flex justify-between">
            <span>Encounter Volume:</span>
            <span>{point.totalAdmissions} Admissions</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm ${className}`}>
      {/* Chart Title & Toggle Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-brand-500" />
            <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
              30-Day Readmission Trajectory: Historical vs. AI Forecast
            </h3>
          </div>
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
            6-month longitudinal baseline with multi-horizon machine learning projection.
          </p>
        </div>

        {/* Interactive View Toggles */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowConfidenceBand(!showConfidenceBand)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              showConfidenceBand
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral dark:bg-warm-neutral/20 dark:text-warm-text-muted'
            }`}
          >
            <ShieldAlertIcon className="h-3.5 w-3.5" />
            <span>95% Confidence Band</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              showBenchmark
                ? 'bg-sage-600 text-white shadow-xs'
                : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral dark:bg-warm-neutral/20 dark:text-warm-text-muted'
            }`}
          >
            <TrendingDownIcon className="h-3.5 w-3.5" />
            <span>National Target ({nationalBenchmark}%)</span>
          </button>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EADDD5" opacity={0.5} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#6B625E' }}
              tickLine={false}
              axisLine={{ stroke: '#EADDD5' }}
            />
            <YAxis
              domain={[6, 14]}
              tick={{ fontSize: 11, fill: '#6B625E' }}
              tickLine={false}
              axisLine={{ stroke: '#EADDD5' }}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 14, fontSize: 12 }}
              iconType="circle"
            />

            {/* Optional 95% Confidence Band Area */}
            {showConfidenceBand && (
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill="#C96B4B"
                fillOpacity={0.12}
                name="Confidence Interval Band (95% CI)"
              />
            )}

            {/* National Target Reference Line */}
            {showBenchmark && (
              <ReferenceLine
                y={nationalBenchmark}
                stroke="#516B56"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Benchmark: ${nationalBenchmark}%`,
                  position: 'right',
                  fill: '#516B56',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Historical Recorded Rate Line */}
            <Line
              type="monotone"
              dataKey="actualRate"
              stroke="#B85A3C"
              strokeWidth={3}
              dot={{ r: 4, fill: '#B85A3C', strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 6, fill: '#B85A3C' }}
              name="Historical Readmission Rate (%)"
              connectNulls={false}
            />

            {/* Forecast Projected Rate Line */}
            <Line
              type="monotone"
              dataKey="forecastedRate"
              stroke="#D9A441"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#D9A441', strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 6, fill: '#D9A441' }}
              name="AI Projected Rate (%) [Simulated]"
              connectNulls={true}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Annotation Footnote */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-warm-border/60 pt-3 text-[11px] text-warm-text-muted dark:text-warm-text-muted">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-brand-600" />
            <span>Solid Line = Historical Clinical Encounters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-amber-500" />
            <span>Dashed Line = Simulated Machine Learning Forecast</span>
          </div>
        </div>

        <div>
          <span>Confidence Interval: <strong>±0.65% margin of error</strong></span>
        </div>
      </div>
    </Card>
  );
}
