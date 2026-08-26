import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { riskService } from '../../services/riskService';
import { patientService } from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import RiskBadge from '../../components/common/RiskBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Eye, ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';

const RiskPredictionsPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const summData = await riskService.getRiskSummary();
      setSummary(summData);

      const patientData = await patientService.getAllPatients();
      setPatients(patientData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Evaluating patient cohort risk scores..." />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  // Prepare chart data format
  const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  // Group by Diagnosis for Risk distribution
  const diagnosisCounts = {};
  patients.forEach(p => {
    if (!diagnosisCounts[p.diagnosis]) {
      diagnosisCounts[p.diagnosis] = { name: p.diagnosis, High: 0, Medium: 0, Low: 0 };
    }
    diagnosisCounts[p.diagnosis][p.riskLevel]++;
  });
  const barChartData = Object.values(diagnosisCounts);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Patient Risk Profiling & Intelligence" 
        description="Forecasted model outputs detailing patient classification risk indices."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Avg Readmission Prob" 
          value={`${summary.averageProbability}%`} 
          icon={TrendingUp}
          color="violet"
          subtitle="All patient cohort average"
        />
        <DashboardCard 
          title="High Risk Volume" 
          value={summary.highRiskCount} 
          icon={AlertTriangle}
          color="red"
          subtitle="Candidates for home intervention"
        />
        <DashboardCard 
          title="Medium Risk Volume" 
          value={summary.mediumRiskCount} 
          icon={ShieldAlert}
          color="amber"
          subtitle="Require constant monitoring"
        />
        <DashboardCard 
          title="Low Risk Volume" 
          value={summary.lowRiskCount} 
          icon={Eye}
          color="emerald"
          subtitle="Standard clinical discharge path"
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Risk Level Distribution Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Risk Category Distribution</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {summary.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Patients`, 'Volume']} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level by Diagnosis Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 font-heading">Patient Risk Levels by Diagnosis</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="High" name="High Risk" fill="#ef4444" stackId="a" />
                <Bar dataKey="Medium" name="Medium Risk" fill="#f59e0b" stackId="a" />
                <Bar dataKey="Low" name="Low Risk" fill="#10b981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patient lists sorted by risk level */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-850 font-heading">High & Medium Risk Cohorts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Diagnosis</th>
                <th className="py-3 px-4">Risk Category</th>
                <th className="py-3 px-4">Readmission Probability</th>
                <th className="py-3 px-4">Staff Assigned</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients
                .filter(p => p.riskLevel !== 'Low')
                .sort((a,b) => b.readmissionProbability - a.readmissionProbability)
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{p.id} • {p.age}y • {p.gender}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{p.diagnosis}</td>
                    <td className="py-3.5 px-4"><RiskBadge risk={p.riskLevel} /></td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-800">{p.readmissionProbability}% probability</td>
                    <td className="py-3.5 px-4 text-slate-550 font-semibold">{p.assignedDoctor}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-slate-200 font-bold hover:bg-slate-55 hover:text-emerald-700 transition"
                      >
                        Evaluate
                      </button>
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

export default RiskPredictionsPage;
