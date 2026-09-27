import React from 'react';

const LoadingSpinner = ({ message = "Loading data..." }) => {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-sm"></div>
      <p className="mt-4 text-xs font-semibold text-slate-500 tracking-wide">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
