'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Compares predicted 30-day readmissions against the rest of the scored cohort. */
export default function ForecastChart({ predicted, total }: { predicted: number; total: number }) {
  const data = [
    { name: 'Predicted readmission', value: predicted },
    { name: 'Not predicted', value: Math.max(total - predicted, 0) },
  ];
  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#6366f1" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
