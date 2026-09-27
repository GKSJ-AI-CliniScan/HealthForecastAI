import React from 'react';

const RiskBadge = ({ risk }) => {
  const normalized = String(risk).trim().toLowerCase();

  if (normalized === 'high') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        High Risk
      </span>
    );
  }

  if (normalized === 'medium') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Medium Risk
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 border border-zinc-200 shadow-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      Low Risk
    </span>
  );
};

export default RiskBadge;
