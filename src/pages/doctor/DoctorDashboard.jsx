import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import RiskBadge from '../../components/common/RiskBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { Users, ShieldAlert, HeartPulse, Brain, ChevronRight, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Doctor can only see assigned patients
        const data = await patientService.getDoctorPatients(user?.name || 'S.Saumya');
        setPatients(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) return <LoadingSpinner message="Loading doctor dashboard..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  // Calculate doctor's patient summaries
  const totalAssigned = patients.length;
  const highRiskCount = patients.filter(p => p.riskLevel === 'High').length;
  const avgProb = totalAssigned > 0
    ? Math.round(patients.reduce((acc, curr) => acc + curr.readmissionProbability, 0) / totalAssigned)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome Back, ${user?.name || 'Doctor'}`}
        description={`Clinical Risk Intelligence Overview — ${user?.specialty || 'General Practitioner'}`}
        actions={
          <Link
            to="/doctor/patients"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
          >
            <Users className="h-4 w-4" /> View Patient List
          </Link>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Assigned Patients"
          value={totalAssigned}
          icon={Users}
          color="blue"
          subtitle="Patients currently under your care"
        />
        <DashboardCard
          title="High Risk Patients"
          value={highRiskCount}
          icon={ShieldAlert}
          color="red"
          subtitle="Require urgent intervention review"
        />
        <DashboardCard
          title="Avg Readmission Risk"
          value={`${avgProb}%`}
          icon={Activity}
          color="amber"
          subtitle="Model forecasted readmission threshold"
        />
      </div>

      {/* Cohort Risk Visualization Chart */}
      <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm flex flex-col space-y-4">
        <h3 className="text-sm font-bold text-slate-805 border-b border-slate-100 pb-2 flex items-center gap-1.5 font-heading">
          <Activity className="h-4.5 w-4.5 text-emerald-600 animate-pulse" /> Readmission Risk Distribution Analysis (%) by Assigned Patient
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={patients} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} suffix="%" />
              <Tooltip formatter={(value) => [`${value}%`, 'Probability']} />
              <Bar dataKey="readmissionProbability" name="Readmission probability" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Grid: Patients + Clinical Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assigned Patients Table Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 font-heading">Your Assigned Patients</h3>
            <Link to="/doctor/patients" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Patient ID</th>
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Diagnosis</th>
                  <th className="py-3 px-2">Risk</th>
                  <th className="py-3 px-2">Probability</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.slice(0, 5).map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/doctor/patients/${p.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-2 font-semibold text-slate-400">{p.id}</td>
                    <td className="py-3 px-2 font-bold text-slate-800">{p.name}</td>
                    <td className="py-3 px-2 text-slate-500 max-w-[150px] truncate">{p.diagnosis}</td>
                    <td className="py-3 px-2"><RiskBadge risk={p.riskLevel} /></td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.readmissionProbability > 70 ? 'bg-red-500' : p.readmissionProbability > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${p.readmissionProbability}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{p.readmissionProbability}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2"><StatusBadge status={p.treatmentStatus} /></td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition"
                        title="View details"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Alerts / Insights Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Brain className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800 font-heading">AI Clinical Insights</h3>
            </div>

            <div className="space-y-3.5">
              <div className="rounded-xl border border-slate-150 p-3 text-xs space-y-1.5 hover:border-emerald-200 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded text-[10px] uppercase">Urgent</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Today</span>
                </div>
                <p className="font-bold text-slate-800">Marcus Vance Discharge Review</p>
                <p className="text-slate-500">Readmission forecasted at <span className="font-bold text-slate-700">82%</span> based on elevated HbA1c. Insulin regimen Adjustment recommendation generated.</p>
                <Link to="/doctor/patients/HFC-001" className="inline-block text-[11px] font-bold text-emerald-600 hover:underline">
                  Review recommendations &rarr;
                </Link>
              </div>

              <div className="rounded-xl border border-slate-150 p-3 text-xs space-y-1.5 hover:border-emerald-200 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] uppercase">Alert</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Yesterday</span>
                </div>
                <p className="font-bold text-slate-800">Tony Stark Pacemaker Calibration</p>
                <p className="text-slate-500">Device software diagnostics parsed. Telemetry feedback suggests sinus rhythm restored.</p>
                <Link to="/doctor/patients/HFC-009" className="inline-block text-[11px] font-bold text-emerald-600 hover:underline">
                  Review readings &rarr;
                </Link>
              </div>
            </div>
          </div>

          <Link
            to="/doctor/clinical-insights"
            className="mt-6 block text-center rounded-xl bg-slate-50 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition"
          >
            Explore Decision Support Hub
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
