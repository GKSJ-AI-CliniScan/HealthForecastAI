import React, { useState, useEffect } from 'react';
import { readmissionService } from '../../services/readmissionService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { ShieldCheck, TrendingDown, Calendar, Users, Activity } from 'lucide-react';

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

  if (loading) return <LoadingSpinner message="Querying temporal readmission database..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      {/* HIPAA reminder */}
      <div className="flex gap-3 rounded-2xl bg-blue-50/70 p-4 border border-blue-200/60 text-xs text-blue-900 font-semibold items-center shadow-2xs">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold underline block uppercase tracking-widest text-[10px]">Anonymized Trend Engine Active</span>
          <p className="font-medium text-slate-600 leading-relaxed mt-0.5">
            Plotting monthly hospital-wide readmission rates containing no individual patient records identifiers.
          </p>
        </div>
      </div>

      <PageHeader 
        title="Epidemiological Readmission Trends" 
        description="Observed and forecasted readmission rate fluctuations across annual multi-center cycles."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardCard
          title="Current Readmission Rate"
          value="14.2%"
          icon={TrendingDown}
          color="emerald"
          trend="-1.4%"
          trendType="decrease"
          subtitle="Down from 15.6% in January"
        />
        <DashboardCard
          title="Monthly Admissions"
          value="315"
          icon={Users}
          color="blue"
          trend="+5.0%"
          trendType="increase"
          subtitle="August inpatient cohort size"
        />
        <DashboardCard
          title="Hospital Target Rate"
          value="12.0%"
          icon={Activity}
          color="amber"
          subtitle="Annual strategic quality goal"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Historical & Projected Readmission Rate (%)</h3>
            <p className="text-[11px] font-medium text-slate-400">8-month observed telemetry vs 12.0% strategic target</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span> Observed Rate
            </span>
            <span className="flex items-center gap-1.5 text-red-500">
              <span className="h-0.5 w-4 bg-red-400 border-dashed"></span> Target (12%)
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trends} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorTrendsRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
                suffix="%" 
                domain={[10, 20]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Average Rate']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
              />
              <ReferenceLine y={12.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area 
                type="monotone" 
                dataKey="readmissionRate" 
                stroke="#3b82f6" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorTrendsRate)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReadmissionTrendsPage;
