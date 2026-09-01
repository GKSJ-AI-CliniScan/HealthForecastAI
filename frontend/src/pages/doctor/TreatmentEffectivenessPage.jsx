import React, { useState, useEffect } from 'react';
import { treatmentService } from '../../services/treatmentService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity, ShieldAlert, Award, Star } from 'lucide-react';

const TreatmentEffectivenessPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Calculating treatment effectiveness data..." />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Treatment Effectiveness & Patient Recovery Analytics" 
        description="Statistics evaluating response indicators across active treatments and drugs."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardCard 
          title="Overall Success Rate" 
          value={`${data.successRate}%`} 
          icon={Award}
          color="emerald"
          subtitle="Treatments satisfying goal timelines"
        />
        <DashboardCard 
          title="Patient Recovery Rate" 
          value={`${data.recoveryRate}%`} 
          icon={Activity}
          color="blue"
          subtitle="Target recovery milestones achieved"
        />
        <DashboardCard 
          title="Optimal Therapy Index" 
          value="A+ Grade" 
          icon={Star}
          color="violet"
          subtitle="Current general ward rating"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recovery Progress Lines Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Patient Recovery Performance Index</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.recoveryProgressTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="cardiac" name="Cardiac Progress" stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="renal" name="Renal Progress" stroke="#f59e0b" strokeWidth={2.5} />
                <Line type="monotone" dataKey="pulmonary" name="Respiratory Progress" stroke="#10b981" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Medication Success Bars Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4 font-heading">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Success & Side Effects by Medication</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.medicationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="treatment" tick={{ fontSize: 8 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="successRate" name="Success Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sideEffectsRate" name="Complication Rate (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Medication Effectiveness Tables Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Medication Effectiveness Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Treatment Protocol</th>
                <th className="py-3 px-4">Clinics Utilizing</th>
                <th className="py-3 px-4 text-center">Observed Success Rate</th>
                <th className="py-3 px-4 text-center">Unfavorable Side Effects</th>
                <th className="py-3 px-4">Evaluation Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.medicationsData.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors font-medium text-slate-650">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{m.treatment}</td>
                  <td className="py-3.5 px-4">General Medicine & Allied Clinics</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{m.successRate}%</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">{m.sideEffectsRate}%</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      m.successRate > 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-755'
                    }`}>
                      {m.successRate > 90 ? 'Excellent response' : 'High response'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TreatmentEffectivenessPage;
