import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const DashboardCard = ({ title, value, icon: Icon = Activity, trend, trendType = 'neutral', subtitle, color = 'red' }) => {
  const colorClasses = {
    red:    'bg-red-50 text-red-600 border-red-200',
    emerald:'bg-emerald-50 text-emerald-600 border-emerald-200',
    blue:   'bg-blue-50 text-blue-600 border-blue-200',
    amber:  'bg-amber-50 text-amber-600 border-amber-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    violet: 'bg-violet-50 text-violet-600 border-violet-200',
    slate:  'bg-zinc-100 text-zinc-600 border-zinc-200'
  };

  const selectedCol = colorClasses[color] || colorClasses.red;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-red-300 hover:shadow-md hover:shadow-red-50 transition-all duration-300 hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{title}</span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${selectedCol} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{value}</span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
            trendType === 'increase'
              ? 'bg-red-50 text-red-600 border border-red-200'
              : trendType === 'decrease'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
          }`}>
            {trendType === 'increase' ? <ArrowUpRight className="h-3 w-3" /> : trendType === 'decrease' ? <ArrowDownRight className="h-3 w-3" /> : null}
            {trend}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <p className="mt-1.5 text-xs font-medium text-zinc-400">
          {subtitle || `${trendType === 'increase' ? 'Up' : trendType === 'decrease' ? 'Down' : 'Steady'} compared to last month`}
        </p>
      )}
    </div>
  );
};

export default DashboardCard;
