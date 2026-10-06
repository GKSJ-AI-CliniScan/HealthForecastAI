'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { RecoveryTrendPoint, RecoveryRegimenInfo } from '@/types/analytics';
import { Card } from '@/components/ui/Card';
import { StethoscopeIcon } from '@/components/ui/Icons';
import { MOCK_RECOVERY_REGIMENS } from '@/services/mockAnalyticsData';

export interface RecoveryTrendChartProps {
  data: RecoveryTrendPoint[];
  regimens?: RecoveryRegimenInfo[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function RecoveryTrendChart({
  data,
  regimens = MOCK_RECOVERY_REGIMENS,
  title = 'Longitudinal Recovery Score Trajectory by Treatment Regimen',
  subtitle = 'Multi-day post-encounter clinical recovery index progression across comparative protocols.',
  className = '',
}: RecoveryTrendChartProps) {
  // Allow toggling active regimens in view
  const [activeKeys, setActiveKeys] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    regimens.forEach((r) => {
      initial[r.key] = true;
    });
    return initial;
  });

  const toggleRegimen = (key: string) => {
    setActiveKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      value?: number;
      dataKey?: string;
      name?: string;
      color?: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="rounded-xl border border-warm-border bg-white dark:bg-warm-card p-3.5 shadow-lg dark:border-warm-border text-xs space-y-2 min-w-[220px]">
        <div className="flex items-center justify-between border-b border-warm-border/60 pb-1.5 dark:border-warm-border/60">
          <span className="font-bold text-warm-text dark:text-warm-text">{label} Evaluation</span>
          <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-1.5 py-0.5 rounded">
            Recovery Index
          </span>
        </div>

        <div className="space-y-1.5">
          {payload.map((entry) => {
            const regimen = regimens.find((r) => r.name === entry.name || r.key === entry.dataKey);
            return (
              <div key={entry.dataKey} className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-warm-text-muted truncate text-[11px]">
                    {regimen?.name ?? entry.name}
                  </span>
                </div>
                <span className="font-bold font-mono text-warm-text dark:text-warm-text">
                  {entry.value} / 100
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-1.5 border-t border-warm-border/40 text-[10px] text-warm-text-light flex justify-between">
          <span>Clinical Recovery Goal:</span>
          <span className="font-semibold text-sage-600">80.0+ Index</span>
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm ${className}`}>
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
        <div>
          <div className="flex items-center gap-2">
            <StethoscopeIcon className="h-4 w-4 text-brand-500" />
            <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
              {title}
            </h3>
          </div>
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Regimen Filter Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-warm-text-muted mr-1">
          Compare Protocols:
        </span>
        {regimens.map((regimen) => {
          const isEnabled = activeKeys[regimen.key] ?? true;
          return (
            <button
              key={regimen.key}
              type="button"
              onClick={() => toggleRegimen(regimen.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                isEnabled
                  ? 'border shadow-xs text-warm-text dark:text-warm-text'
                  : 'bg-warm-neutral/30 text-warm-text-light opacity-50 line-through border-transparent'
              }`}
              style={{
                borderColor: isEnabled ? regimen.color : 'transparent',
                backgroundColor: isEnabled ? `${regimen.color}15` : undefined,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: regimen.color }}
              />
              <span>{regimen.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Chart Canvas */}
      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EADDD5" opacity={0.5} />
            <XAxis
              dataKey="timeframe"
              tick={{ fontSize: 11, fill: '#6B625E' }}
              tickLine={false}
              axisLine={{ stroke: '#EADDD5' }}
            />
            <YAxis
              domain={[40, 100]}
              tick={{ fontSize: 11, fill: '#6B625E' }}
              tickLine={false}
              axisLine={{ stroke: '#EADDD5' }}
              unit=" pts"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 14, fontSize: 12 }}
              iconType="circle"
            />

            {/* Target Clinical Recovery Score Reference Line */}
            <ReferenceLine
              y={80}
              stroke="#516B56"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Clinical Recovery Target: 80',
                position: 'insideTopRight',
                fill: '#516B56',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Dynamic Lines for each regimen */}
            {regimens.map((regimen) => {
              const isVisible = activeKeys[regimen.key] ?? true;
              if (!isVisible) return null;

              return (
                <Line
                  key={regimen.key}
                  type="monotone"
                  dataKey={regimen.key}
                  name={regimen.name}
                  stroke={regimen.color}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: regimen.color, strokeWidth: 1.5, stroke: '#FFFFFF' }}
                  activeDot={{ r: 5.5, fill: regimen.color }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Notes */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-warm-border/60 pt-3 text-[11px] text-warm-text-muted dark:text-warm-text-muted">
        <div>
          <span>Recovery Index is derived from symptom stabilization, lab normalization, and functional independence.</span>
        </div>
        <div>
          <span className="text-teal-700 dark:text-teal-400 font-semibold">
            Tele-Care demonstrates fastest stabilization (+39.4 pts in 30d)
          </span>
        </div>
      </div>
    </Card>
  );
}
