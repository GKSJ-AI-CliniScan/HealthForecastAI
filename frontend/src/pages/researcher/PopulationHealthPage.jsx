import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Activity, ShieldCheck, HeartPulse, Stethoscope } from 'lucide-react';

const PopulationHealthPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await analyticsService.getResearchData();
        setData(res);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Assembling population clusters and cohort analytics..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const diagnosisData = (data.riskByDiagnosisIndex || []).map(item => ({
    ...item,
    cleanName: item.diagnosis.replace('Mellitus', '').replace('Exacerbation', '').trim(),
  }));

  return (
    <div className="space-y-6">
      {/* HIPAA Compliance Note */}
      <div className="flex gap-3 rounded-2xl bg-blue-50/70 p-4 border border-blue-200/60 text-xs text-blue-900 font-semibold items-center shadow-2xs">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold underline block uppercase tracking-widest text-[10px]">De-Identified Research Data Active</span>
          <p className="font-medium text-slate-600 leading-relaxed mt-0.5">
            Aggregated diagnostic readmission vectors. All individual patient identifiers (PII) are scrubbed.
          </p>
        </div>
      </div>

      <PageHeader 
        title="Population Health Analytics" 
        description="Cross-cohort risk indicators, epidemiological incidence, and diagnostic frequency distributions."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardCard
          title="Highest Risk Category"
          value="Heart Failure"
          icon={HeartPulse}
          color="red"
          subtitle="58% observed high-risk ratio"
        />
        <DashboardCard
          title="Most Prevalent Cohort"
          value="Type 2 Diabetes"
          icon={Stethoscope}
          color="amber"
          subtitle="112 tracked patient records"
        />
        <DashboardCard
          title="Average Inpatient Stay"
          value="6.4 Days"
          icon={Activity}
          color="blue"
          subtitle="Across chronic disease clusters"
        />
      </div>

      {/* Bar Chart comparing high risk rates across diseases */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">High Readmission Risk Incidence (%) by Diagnosis</h3>
            <p className="text-[11px] font-medium text-slate-400">Proportion of patients scoring &gt;70% readmission risk</p>
          </div>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
            Cohort Benchmark
          </span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={diagnosisData} margin={{ top: 15, right: 15, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="cleanName" 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} 
                suffix="%" 
                domain={[0, 70]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'High Risk Proportion']}
                labelFormatter={(label) => `Diagnosis: ${label}`}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Bar dataKey="highRiskPct" name="High Risk Incidence Ratio" radius={[6, 6, 0, 0]} barSize={42}>
                {diagnosisData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.highRiskPct > 50 ? '#ef4444' : entry.highRiskPct > 30 ? '#f59e0b' : '#3b82f6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PopulationHealthPage;
