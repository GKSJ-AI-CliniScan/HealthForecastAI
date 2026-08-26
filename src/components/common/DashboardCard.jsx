import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const DashboardCard = ({ title, value, icon: Icon = Activity, trend, trendType = 'neutral', subtitle, color = 'emerald' }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100'
  };

  const selectedCol = colorClasses[color] || colorClasses.emerald;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${selectedCol}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
            trendType === 'increase' 
              ? 'bg-emerald-50 text-emerald-700' 
              : trendType === 'decrease' 
                ? 'bg-red-50 text-red-700' 
                : 'bg-slate-50 text-slate-700'
          }`}>
            {trendType === 'increase' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : trendType === 'decrease' ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {trend}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <p className="mt-1.5 text-xs font-medium text-slate-400">
          {subtitle || `${trendType === 'increase' ? 'Up' : trendType === 'decrease' ? 'Down' : 'Steady'} compared to last month`}
        </p>
      )}
    </div>
  );
};

export default DashboardCard;
