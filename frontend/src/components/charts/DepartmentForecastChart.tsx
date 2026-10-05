'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DepartmentForecast } from '@/types/forecast';
import { Card } from '@/components/ui/Card';
import { LayersIcon } from '@/components/ui/Icons';

export interface DepartmentForecastChartProps {
  departments: DepartmentForecast[];
  className?: string;
}

export function DepartmentForecastChart({
  departments,
  className = '',
}: DepartmentForecastChartProps) {
  const chartData = departments.map((dept) => ({
    name: dept.departmentName.split('&')[0].trim(),
    fullName: dept.departmentName,
    currentRate: dept.currentRate,
    projectedRate: dept.projectedRate,
    rateChange: dept.rateChange,
    patientVolume: dept.patientVolume,
    riskTier: dept.riskTier,
  }));

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      value?: number;
      dataKey?: string;
      name?: string;
      color?: string;
      payload: (typeof chartData)[0];
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    const dept = payload[0]?.payload;
    if (!dept) return null;

    return (
      <div className="rounded-xl border border-warm-border bg-white dark:bg-warm-card p-3 shadow-lg dark:border-warm-border text-xs space-y-1.5 min-w-[180px]">
        <div className="font-bold text-warm-text dark:text-warm-text border-b border-warm-border/60 pb-1">
          {dept.fullName}
        </div>
        <div className="flex justify-between items-center text-warm-text">
          <span>Current Rate:</span>
          <span className="font-bold font-mono text-brand-700">{dept.currentRate}%</span>
        </div>
        <div className="flex justify-between items-center text-warm-text">
          <span>Projected Rate:</span>
          <span className="font-bold font-mono text-amber-700">{dept.projectedRate}%</span>
        </div>
        <div className="flex justify-between items-center text-sage-700 font-semibold pt-1 border-t border-warm-border/40">
          <span>Expected Change:</span>
          <span className="font-mono">{dept.rateChange}%</span>
        </div>
        <div className="text-[10px] text-warm-text-muted">
          Active Patient Volume: {dept.patientVolume} cases
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
        <div>
          <div className="flex items-center gap-2">
            <LayersIcon className="h-4 w-4 text-brand-500" />
            <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
              Departmental Readmission Rate Comparison
            </h3>
          </div>
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
            Current baseline vs. machine learning forecast by hospital clinical service.
          </p>
        </div>
      </div>

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EADDD5" opacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6B625E' }}
              tickLine={false}
              axisLine={{ stroke: '#EADDD5' }}
            />
            <YAxis
              domain={[0, 18]}
              tick={{ fontSize: 11, fill: '#6B625E' }}
              tickLine={false}
              axisLine={{ stroke: '#EADDD5' }}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
              iconType="circle"
            />
            <Bar
              dataKey="currentRate"
              name="Current Baseline (%)"
              fill="#C96B4B"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="projectedRate"
              name="Projected Forecast (%)"
              fill="#D9A441"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
