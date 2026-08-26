import React, { useState, useEffect } from 'react';
import { readmissionService } from '../../services/readmissionService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ShieldCheck } from 'lucide-react';

const ReadmissionTrendsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await readmissionService.getForecastingMetrics();
        setData(res);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Querying temporal trends database..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      {/* HIPAA reminder */}
      <div className="flex gap-3 rounded-2xl bg-blue-50/50 p-4 border border-blue-150 text-xs text-blue-800 font-semibold items-center">
        <ShieldCheck className="h-5.5 w-5.5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold underline block uppercase tracking-widest text-[10px]">Anonymized Trend Engine Active</span>
          <p className="font-medium text-slate-550 leading-relaxed font-heading">
            Plotting monthly hospital-wide readmission rates containing no individual patient records identifiers.
          </p>
        </div>
      </div>

      <PageHeader 
        title="Epidemiological Readmission Trends" 
        description="Observed and forecasted readmission fluctuations across annual cycles."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Historical & Projected Readmissions Rate Graph</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTrendsRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} suffix="%" />
              <Tooltip formatter={(value) => [`${value}%`, 'Average Rate']} />
              <Area type="monotone" dataKey="readmissionRate" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTrendsRate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReadmissionTrendsPage;
