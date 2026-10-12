import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

const ErrorState = ({ title = "Connection anomaly detected", error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/30 p-10 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 border border-red-150 text-red-500">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
      {error && (
        <code className="mt-2 block rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 font-semibold border border-red-100 max-w-lg truncate">
          {error.message || String(error)}
        </code>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
        >
          <RotateCw className="h-3.5 w-3.5" /> Reconnect Now
        </button>
      )}
    </div>
  );
};

export default ErrorState;
