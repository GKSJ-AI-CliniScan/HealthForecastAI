import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="h-16 w-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center border border-red-100 animate-pulse">
        <ShieldAlert className="h-8 w-8" />
      </div>
      
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-extrabold text-slate-800 font-heading">Access Denied (403 Forbidden)</h2>
        <p className="text-xs font-semibold text-slate-450 leading-relaxed">
          Your active directory capability keys are insufficient to clear route security protocols for this path. 
          Please contact St. Jude System Administrators to adjust role scopes.
        </p>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Go Back
      </button>
    </div>
  );
};

export default UnauthorizedPage;
