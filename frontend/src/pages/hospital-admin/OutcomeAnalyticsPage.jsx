import React, { useState, useEffect } from 'react';
import { treatmentService } from '../../services/treatmentService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Sparkles, Activity, ShieldAlert, Award, Pill } from 'lucide-react';

const OutcomeAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await treatmentService.getTreatmentSummary();
        setData(res);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Calculating treatment success vectors..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const formattedMedData = (data.medicationsData || []).map(med => ({
    ...med,
    shortTreatment: med.treatment.split('(')[0].trim(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Patient Outcome Analytics" 
        description="Comprehensive clinical indicators detailing inpatient recovery rates, therapy efficacy, and complication tracking."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard 
          title="Clinical Recovery Index" 
          value={`${data.recoveryRate}%`} 
          icon={Activity}
          color="emerald"
          trend="+3.2%"
          trendType="increase"
          subtitle="Inpatients achieving discharge criteria"
        />
        <DashboardCard 
          title="Therapeutic Efficacy" 
          value={`${data.successRate}%`} 
          icon={Award}
          color="blue"
          trend="+1.8%"
          trendType="increase"
          subtitle="Treatments meeting target outcomes"
        />
        <DashboardCard 
          title="Complication Prevalence" 
          value="4.1%" 
          icon={ShieldAlert}
          color="red"
          trend="-0.6%"
          trendType="decrease"
          subtitle="Reported drug side effects index"
        />
      </div>

      {/* Recharts Bar graph comparing drugs success */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Efficacy & Adverse Complication Rates by Medication Protocol (%)</h3>
            <p className="text-[11px] font-medium text-slate-400">Comparing therapeutic success vs adverse reaction rates</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span> Efficacy Rate
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-400"></span> Complication Index
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedMedData} margin={{ top: 15, right: 15, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="shortTreatment" 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
                suffix="%" 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Bar dataKey="successRate" name="Efficacy Success Rate (%)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
              <Bar dataKey="sideEffectsRate" name="Complication Index (%)" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OutcomeAnalyticsPage;
