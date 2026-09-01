import React from 'react';
import { FolderOpen } from 'lucide-react';

const EmptyState = ({ title = "No records found", description = "Try adjusting your filters or search keywords.", icon: Icon = FolderOpen, action }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white p-12 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
      <p className="mt-1.5 text-xs font-semibold text-slate-400 max-w-sm">{description}</p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
