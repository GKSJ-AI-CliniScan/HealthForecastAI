import React from 'react';

const StatusBadge = ({ status }) => {
  const normalized = String(status).trim().toLowerCase();

  let styles = 'bg-zinc-100 text-zinc-600 border-zinc-200';
  let dotColor = 'bg-zinc-400';

  if (['recovered', 'stable', 'active', 'success'].includes(normalized)) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (['improving', 'processing', 'testing'].includes(normalized)) {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  } else if (['deteriorating', 'critical', 'standby', 'failed'].includes(normalized)) {
    styles = 'bg-red-50 text-red-700 border-red-200';
    dotColor = 'bg-red-500 animate-pulse';
  } else if (['pending', 'fair'].includes(normalized)) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
};

export default StatusBadge;
