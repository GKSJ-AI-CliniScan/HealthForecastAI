import React from 'react';

const RiskBadge = ({ risk }) => {
  const normalized = String(risk).trim().toLowerCase();
  
  if (normalized === 'high') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-100">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
        High Risk
      </span>
    );
  }
  
  if (normalized === 'medium') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-100">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-505 bg-amber-500"></span>
        Medium Risk
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      Low Risk
    </span>
  );
};

export default RiskBadge;
