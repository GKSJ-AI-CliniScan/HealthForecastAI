'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ReadmissionTrendPoint } from '@/types/analytics';
import { Card } from '@/components/ui/Card';
import { ActivityIcon, TrendingDownIcon } from '@/components/ui/Icons';

export interface ReadmissionChartProps {
  data: ReadmissionTrendPoint[];
  benchmark?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ReadmissionChart({
  data,
  benchmark = 8.0,
  title = 'Longitudinal 30-Day Readmission Trajectory',
  subtitle = 'Monthly recorded readmission percentage compared against clinical quality benchmarks.',
  className = '',
}: ReadmissionChartProps) {
  const [showBenchmark, setShowBenchmark] = useState(true);

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      value?: number;
      dataKey?: string;
      name?: string;
      color?: string;
      payload: ReadmissionTrendPoint;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    const rateDiff = (point.rate - (point.benchmark || benchmark)).toFixed(2);
    const isAboveBenchmark = point.rate > (point.benchmark || benchmark);

    return (
      <div className="rounded-xl border border-warm-border bg-white dark:bg-warm-card p-3.5 shadow-lg dark:border-warm-border text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-warm-border/60 pb-1.5 dark:border-warm-border/60">
          <span className="font-bold text-warm-text dark:text-warm-text">{label}</span>
          <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/80 px-1.5 py-0.5 rounded">
            Clinical Quality
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-brand-700 dark:text-brand-300">
            <span className="font-medium">Readmission Rate:</span>
            <span className="font-bold font-mono text-sm">{point.rate}%</span>
          </div>

          <div className="flex justify-between items-center text-sage-600 dark:text-sage-400 text-[11px]">
            <span>Quality Target:</span>
            <span className="font-mono font-semibold">{point.benchmark || benchmark}%</span>
          </div>

          <div className="flex justify-between items-center text-warm-text-muted text-[11px]">
            <span>Variance to Target:</span>
            <span
              className={`font-mono font-semibold ${
                isAboveBenchmark ? 'text-coral-600 dark:text-coral-400' : 'text-sage-600 dark:text-sage-400'
              }`}
            >
              {isAboveBenchmark ? `+${rateDiff}%` : `${rateDiff}%`}
            </span>
          </div>

          <div className="pt-1.5 border-t border-warm-border/40 text-[11px] text-warm-text-muted flex justify-between">
            <span>Encounter Volume:</span>
            <span>
              {point.readmissions} / {point.admissions} patients
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-brand-500" />
            <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
              {title}
            </h3>
          </div>
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
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
            <span>Benchmark Target ({benchmark}%)</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EADDD5" opacity={0.5} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#6B625E' }}
              tickLine={false}
              axisLine={{ stroke: '#EADDD5' }}
            />
            <YAxis
              domain={[6, 13]}
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

            {showBenchmark && (
              <ReferenceLine
                y={benchmark}
                stroke="#516B56"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Benchmark: ${benchmark}%`,
                  position: 'right',
                  fill: '#516B56',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="rate"
              stroke="#B85A3C"
              fill="#B85A3C"
              fillOpacity={0.12}
              strokeWidth={3}
              name="Readmission Rate (%)"
              dot={{ r: 4, fill: '#B85A3C', strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 6, fill: '#B85A3C' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Notes */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-warm-border/60 pt-3 text-[11px] text-warm-text-muted dark:text-warm-text-muted">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-brand-600" />
            <span>Monthly Performance Trend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-sage-600" />
            <span>Institutional Target Benchmark (8.0%)</span>
          </div>
        </div>

        <div>
          <span>Data update cadence: <strong>Daily midnight rollups</strong></span>
        </div>
      </div>
    </Card>
  );
}
