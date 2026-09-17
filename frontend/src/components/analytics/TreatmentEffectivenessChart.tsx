import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { TreatmentTypeDistribution } from '@/features/analytics/analytics.types';

interface TreatmentEffectivenessChartProps {
  data: TreatmentTypeDistribution[];
}

export const TreatmentEffectivenessChart: React.FC<TreatmentEffectivenessChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-400 text-sm">
        No treatment effectiveness records available to chart.
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    name: d.treatment_type,
    count: d.count,
    avgScore: d.avg_effectiveness ? Math.round(d.avg_effectiveness) : 0,
  }));

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Effectiveness by Treatment Modality
        </h3>
        <p className="text-xs text-slate-500">
          Evaluated treatment volume vs. mean outcome effectiveness score (0–100)
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
            <XAxis
              dataKey="name"
              angle={-20}
              textAnchor="end"
              tick={{ fontSize: 11, fill: '#64748b' }}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#0d9488"
              tick={{ fontSize: 11 }}
              label={{ value: 'Patient Volume', angle: -90, position: 'insideLeft', style: { fill: '#0d9488', fontSize: 10 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              stroke="#6366f1"
              tick={{ fontSize: 11 }}
              label={{ value: 'Avg Score (0-100)', angle: 90, position: 'insideRight', style: { fill: '#6366f1', fontSize: 10 } }}
            />
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
            <Bar
              yAxisId="left"
              dataKey="count"
              name="Treatments Prescribed"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="avgScore"
              name="Mean Effectiveness (0-100)"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
