import React from 'react';

const StatusBadge = ({ status }) => {
  const normalized = String(status).trim().toLowerCase();
  
  let styles = 'bg-slate-50 text-slate-700 border-slate-100';
  let dotColor = 'bg-slate-400';

  if (normalized === 'recovered' || normalized === 'stable' || normalized === 'active' || normalized === 'success') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    dotColor = 'bg-emerald-500';
  } else if (normalized === 'improving' || normalized === 'processing' || normalized === 'testing') {
    styles = 'bg-blue-50 text-blue-700 border-blue-100';
    dotColor = 'bg-blue-500';
  } else if (normalized === 'deteriorating' || normalized === 'critical' || normalized === 'standby' || normalized === 'failed') {
    styles = 'bg-red-50 text-red-700 border-red-100';
    dotColor = 'bg-red-500';
  } else if (normalized === 'pending' || normalized === 'fair') {
    styles = 'bg-amber-50 text-amber-700 border-amber-100';
    dotColor = 'bg-amber-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
      {status}
    </span>
  );
};

export default StatusBadge;
