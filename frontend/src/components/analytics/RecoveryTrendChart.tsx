import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { OutcomeTrendPoint } from '@/features/analytics/analytics.types';

interface RecoveryTrendChartProps {
  data: OutcomeTrendPoint[];
}

export const RecoveryTrendChart: React.FC<RecoveryTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-400 text-sm">
        No recovery trend progression recorded over time.
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Patient Recovery & Outcome Trends
        </h3>
        <p className="text-xs text-slate-500">
          Progression of improved, stable, and adverse recovery evaluations over time
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorImproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorStable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorWorsened" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
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
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Area
              type="monotone"
              dataKey="improved"
              name="Improved / Recovered"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorImproved)"
            />
            <Area
              type="monotone"
              dataKey="stable"
              name="Stable"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorStable)"
            />
            <Area
              type="monotone"
              dataKey="worsened"
              name="Worsened / Complications"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorWorsened)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
