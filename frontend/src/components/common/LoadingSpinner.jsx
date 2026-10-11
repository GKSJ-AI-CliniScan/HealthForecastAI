import React, { useEffect, useState } from 'react';

// After this long the wait is almost certainly a sleeping server rather than a
// slow query, so the message says so instead of implying progress.
const SLOW_AFTER_MS = 6000;

const LoadingSpinner = ({
  message = "Loading data...",
  slowMessage = "Waking the server - the first load after a pause can take a minute.",
}) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-sm"></div>
      <p className={`mt-4 text-xs font-semibold tracking-wide ${slow ? 'text-amber-600' : 'text-slate-500'}`}>
        {slow ? slowMessage : message}
      </p>
    </div>
  );
};

export default LoadingSpinner;
