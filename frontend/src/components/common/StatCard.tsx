import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'teal' | 'sky' | 'purple' | 'amber' | 'rose' | 'emerald';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
  trend,
}) => {
  const colorGradients = {
    teal: 'from-teal-500/20 to-teal-500/5 text-teal-600 dark:text-teal-400 border-teal-500/20',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };

  return (
    <Card hoverable className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1 text-xs font-medium">
              <span className={trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                {trend.isPositive ? '+' : ''}{trend.value}
              </span>
              <span className="text-slate-400 dark:text-slate-500">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-2xl bg-gradient-to-br border ${colorGradients[color]} shadow-sm`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
};
