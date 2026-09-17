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
import { MedicationSummaryItem } from '@/features/analytics/analytics.types';

interface MedicationEffectivenessChartProps {
  data: MedicationSummaryItem[];
}

export const MedicationEffectivenessChart: React.FC<MedicationEffectivenessChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-400 text-sm">
        No medication records available to display.
      </Card>
    );
  }

  const chartData = data.slice(0, 10).map((d) => ({
    name: d.medication_name,
    patients: d.total_patients,
    active: d.active_count,
    effectiveness: d.avg_effectiveness ? Math.round(d.avg_effectiveness) : 0,
  }));

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Medication Prescription Volume & Therapeutic Response
        </h3>
        <p className="text-xs text-slate-500">
          Active patient cohort size vs. average recorded outcome score (0–100)
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
              stroke="#0284c7"
              tick={{ fontSize: 11 }}
              label={{ value: 'Patient Count', angle: -90, position: 'insideLeft', style: { fill: '#0284c7', fontSize: 10 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              stroke="#10b981"
              tick={{ fontSize: 11 }}
              label={{ value: 'Avg Effectiveness', angle: 90, position: 'insideRight', style: { fill: '#10b981', fontSize: 10 } }}
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
              dataKey="patients"
              name="Prescribed Patients"
              fill="#0284c7"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="effectiveness"
              name="Effectiveness Score"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
