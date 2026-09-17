import React from 'react';
import {
  Users,
  Building2,
  Stethoscope,
  Clock,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { HospitalPerformanceResponse } from '@/features/analytics/analytics.types';
import { formatPercentage, formatScore } from '@/features/analytics/analytics.utils';

interface HospitalPerformanceCardsProps {
  data: HospitalPerformanceResponse;
}

export const HospitalPerformanceCards: React.FC<HospitalPerformanceCardsProps> = ({ data }) => {
  const cards = [
    {
      title: 'Total Patients',
      value: data.total_patients.toLocaleString(),
      subtitle: `${data.department_count} active clinical departments`,
      icon: Users,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    },
    {
      title: 'Total Admissions',
      value: data.total_admissions.toLocaleString(),
      subtitle: `Inpatient episodes logged`,
      icon: Building2,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    },
    {
      title: 'Treatments Executed',
      value: data.total_treatments.toLocaleString(),
      subtitle: `${formatPercentage(data.treatment_completion_rate)} completion rate`,
      icon: Stethoscope,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    },
    {
      title: 'Mean Length of Stay',
      value: `${data.average_length_of_stay.toFixed(1)} days`,
      subtitle: 'Average inpatient stay',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    },
    {
      title: 'Readmission Risk Rate',
      value: formatPercentage(data.readmission_statistics.readmission_rate_pct),
      subtitle: `${data.readmission_statistics.high_risk_count} high-risk watchlist cases`,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    },
    {
      title: 'Mean Treatment Score',
      value: formatScore(data.average_treatment_effectiveness),
      subtitle: 'Therapeutic effectiveness index',
      icon: Award,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c, i) => (
        <Card key={i} className="p-5 border transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {c.title}
            </span>
            <div className={`p-2 rounded-xl border ${c.bg}`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
              {c.value}
            </span>
            <p className="text-xs text-slate-500 mt-1">{c.subtitle}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
