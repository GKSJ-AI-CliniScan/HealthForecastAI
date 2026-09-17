import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { HealthcareTrendPoint } from '@/features/analytics/analytics.types';

interface HealthcareTrendChartProps {
  trends: HealthcareTrendPoint[];
  frequency: 'daily' | 'weekly' | 'monthly';
  onFrequencyChange: (freq: 'daily' | 'weekly' | 'monthly') => void;
}

export const HealthcareTrendChart: React.FC<HealthcareTrendChartProps> = ({
  trends,
  frequency,
  onFrequencyChange,
}) => {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Multi-Metric Healthcare Trend Monitoring
          </h3>
          <p className="text-xs text-slate-500">
            Comparative trajectory of inpatient volume, therapies, readmissions, and outcomes
          </p>
        </div>

        {/* Frequency Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs self-start">
          <button
            onClick={() => onFrequencyChange('daily')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              frequency === 'daily'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => onFrequencyChange('weekly')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              frequency === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => onFrequencyChange('monthly')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              frequency === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {trends.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          No trend data points recorded for selected interval.
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="admissions"
                name="Admissions"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="discharges"
                name="Discharges"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="treatments"
                name="Treatments"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="readmissions"
                name="Readmissions"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="high_risk_patients"
                name="High Risk Patients"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
