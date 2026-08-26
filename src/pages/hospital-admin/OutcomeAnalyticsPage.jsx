import React, { useState, useEffect } from 'react';
import { treatmentService } from '../../services/treatmentService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Sparkles, Activity, ShieldAlert, Award } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Patient Outcome Analytics" 
        description="Comprehensive metrics detailing inpatient recovery rates and clinical milestones."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard 
          title="Clinical Recovery Index" 
          value={`${data.recoveryRate}%`} 
          icon={Activity}
          color="emerald"
          subtitle="Cohort recovering in targets"
        />
        <DashboardCard 
          title="Therapeutic Efficacy" 
          value={`${data.successRate}%`} 
          icon={Award}
          color="blue"
          subtitle="Satisfying diagnostic checklists"
        />
        <DashboardCard 
          title="Complication Prevalence" 
          value="4.1%" 
          icon={ShieldAlert}
          color="red"
          subtitle="Observed side effects index"
        />
      </div>

      {/* Recharts Bar graph comparing drugs success */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Efficacy & Complex Side Effects by Protocol</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.medicationsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="treatment" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend iconType="circle" />
              <Bar dataKey="successRate" name="Efficacy Success Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sideEffectsRate" name="Complication Index (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OutcomeAnalyticsPage;
