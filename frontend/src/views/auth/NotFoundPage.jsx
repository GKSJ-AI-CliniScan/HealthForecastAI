import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="h-16 w-16 bg-slate-50 text-slate-500 rounded-3xl flex items-center justify-center border border-slate-100">
        <AlertCircle className="h-8 w-8" />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-extrabold text-slate-800 font-heading">Page Not Found (404)</h2>
        <p className="text-xs font-semibold text-slate-450 leading-relaxed">
          The routing index could not locate the requested clinical path resources.
        </p>
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
      >
        <Home className="h-4 w-4" /> Go to Login / Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
