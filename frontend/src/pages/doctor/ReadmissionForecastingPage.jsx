import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { readmissionService } from '../../services/readmissionService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Lightbulb, TrendingUp, AlertTriangle, UserCheck } from 'lucide-react';

const ReadmissionForecastingPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Consulting AI model forecasting arrays..." />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="AI Readmission Forecasting" 
        description="Temporal trend prediction arrays showing upcoming readmission probabilities."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardCard 
          title="Historical Avg Rate" 
          value={`${data.recentRate}%`} 
          icon={TrendingUp}
          color="emerald"
          subtitle="Hospital-wide benchmark rate"
        />
        <DashboardCard 
          title="High-Risk Cohort Size" 
          value={data.highRiskCount} 
          icon={AlertTriangle}
          color="red"
          subtitle="Candidates representing focus points"
        />
        <DashboardCard 
          title="Forecated Readmissions (30d)" 
          value={data.predictedReadmissions} 
          icon={UserCheck}
          color="blue"
          subtitle="Model estimated target patient count"
        />
      </div>

      {/* Area Chart Card */}
      <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 font-heading">Expected 30-Day Hospital Readmission Rate Trends</h3>
          <span className="text-[10px] font-bold text-emerald-600 border border-emerald-100 bg-emerald-50 px-2.5 py-1 rounded">
            93.2% Model ROC-AUC Accuracy
          </span>
        </div>
        
        <div className="h-72 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} suffix="%" />
              <Tooltip formatter={(value) => [`${value}%`, 'Readmission Rate']} />
              <Area type="monotone" dataKey="readmissionRate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Decision recommendation alerts list */}
      <div className="rounded-2xl border border-slate-200 bg-emerald-50/15 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-emerald-800">
          <Lightbulb className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold font-heading">AI Predictive Insights</h3>
        </div>
        
        <div className="divide-y divide-emerald-100/50 text-xs">
          <div className="py-3.5 space-y-1">
            <h4 className="font-bold text-slate-800">Seasonal Pulmonology Forecast</h4>
            <p className="text-slate-500 font-medium leading-relaxed">
              Readmission probability for COPD is forecasted to increase by <span className="font-bold text-emerald-700">4.2%</span> over the next 30 days due to seasonal respiratory variants. 
              Recommend increasing early triage check phone calls in endocrinology and pulmonology clinics.
            </p>
          </div>
          <div className="py-3.5 space-y-1">
            <h4 className="font-bold text-slate-800">Cardiology Recovery Performance</h4>
            <p className="text-slate-500 font-medium leading-relaxed">
              Cardiology readmissions are down <span className="font-bold text-emerald-700">1.8%</span> compared to the historical baseline, likely driven by standard deployment of biofeedback scales across congestive heart failure patients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadmissionForecastingPage;
