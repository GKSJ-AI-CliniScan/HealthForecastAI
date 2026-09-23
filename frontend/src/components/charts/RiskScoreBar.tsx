'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import type { RiskCategory } from '@/types';

const COLORS: Record<RiskCategory, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
};

/** A single horizontal bar showing a probability (0-1), colour-coded by risk category. */
export default function RiskScoreBar({
  probability,
  category,
}: {
  probability: number;
  category: RiskCategory;
}) {
  const data = [{ name: 'score', value: Math.round(probability * 100) }];
  return (
    <div style={{ width: '100%', height: 36 }} aria-hidden="true">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" hide />
          <Bar dataKey="value" radius={4} barSize={20}>
            <Cell fill={COLORS[category]} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
