import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { OUTCOME_COLORS } from '@/features/analytics/analytics.utils';

interface TreatmentOutcomeChartProps {
  outcomeDistribution: Record<string, number>;
  title?: string;
  subtitle?: string;
}

export const TreatmentOutcomeChart: React.FC<TreatmentOutcomeChartProps> = ({
  outcomeDistribution,
  title = 'Treatment Outcome Distribution',
  subtitle = 'Breakdown of clinical treatment endpoints recorded',
}) => {
  const chartData = Object.entries(outcomeDistribution)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace('_', ' '),
      rawKey: status,
      value: count,
    }));

  if (chartData.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-400 text-sm">
        No outcome records available to chart.
      </Card>
    );
  }

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle} (Total: {total})</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.rawKey}
                  fill={OUTCOME_COLORS[entry.rawKey] || '#94A3B8'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => [
                `${value} (${((Number(value) / total) * 100).toFixed(1)}%)`,
                name,
              ]}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
