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
import Modal from '../../components/common/Modal';
import { Users, ShieldAlert, ChevronRight, Activity, Sparkles, UserPlus, CheckCircle2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    diagnosis: 'Type 2 Diabetes',
    riskLevel: 'Medium',
    readmissionProbability: 45,
    treatmentStatus: 'Stable',
    assignedDoctor: user?.name || 'S.Saumya',
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await patientService.getAllPatients();
      setPatients(data);
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!newPatient.name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await patientService.addPatient({
        name: newPatient.name.trim(),
        age: parseInt(newPatient.age, 10) || 45,
        gender: newPatient.gender,
        diagnosis: newPatient.diagnosis,
        riskLevel: newPatient.riskLevel,
        readmissionProbability: parseInt(newPatient.readmissionProbability, 10) || 50,
        treatmentStatus: newPatient.treatmentStatus,
        assignedDoctor: newPatient.assignedDoctor || user?.name || 'S.Saumya',
      });

      setCreateModalOpen(false);
      setToastMessage(`Patient ${created.name} (${created.id}) registered successfully!`);
      setTimeout(() => setToastMessage(''), 5000);

      setNewPatient({
        name: '',
        age: '',
        gender: 'Male',
        diagnosis: 'Type 2 Diabetes',
        riskLevel: 'Medium',
        readmissionProbability: 45,
        treatmentStatus: 'Stable',
        assignedDoctor: user?.name || 'S.Saumya',
      });

      await load();
    } catch (err) {
      alert('Error creating patient: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading clinical intelligence dashboard..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const totalAssigned = patients.length;
  const highRiskCount = patients.filter(p => p.riskLevel === 'High').length;
  const avgProb = totalAssigned > 0 ? Math.round(patients.reduce((acc, curr) => acc + (curr.readmissionProbability || 0), 0) / totalAssigned) : 48;
  const chartPatients = patients.slice(0, 8).map(p => ({
    ...p,
    shortName: (p.name || '').split(' ')[0] + ' ' + ((p.name || '').split(' ')[1] ? (p.name || '').split(' ')[1][0] + '.' : ''),
  }));

  const tooltipStyle = { borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e4e4e7', color: '#18181b', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-md animate-fade-up">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <PageHeader
        title={`Welcome Back, ${user?.name || 'Doctor'}`}
        description={`Clinical Risk Intelligence Overview — ${user?.specialty || 'Cardiology & Endocrinology Specialist'}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-200 hover:from-red-700 hover:to-rose-800 transition hover:scale-102 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> Add Patient Record
            </button>
            <Link to="/doctor/patients" className="inline-flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-red-600 transition shadow-xs">
              <Users className="h-4 w-4 text-red-500" /> Patient Registry
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Assigned Patients" value={totalAssigned} icon={Users} color="slate" trend="+2 New" trendType="neutral" subtitle="Active patients under your direct care" />
        <DashboardCard title="High Risk Patients" value={highRiskCount} icon={ShieldAlert} color="red" trend="Immediate Watch" trendType="increase" subtitle="Require urgent clinical discharge review" />
        <DashboardCard title="Avg Readmission Risk" value={`${avgProb}%`} icon={Activity} color="amber" trend="Cohort Average" trendType="neutral" subtitle="30-day predicted readmission rate" />
      </div>

      {/* Risk Chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col space-y-4 hover:border-red-200 transition-all">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-bold text-zinc-800">Assigned Cohort Readmission Risk Distribution (%)</h3>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400">Risk Threshold Score (0–100%)</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartPatients} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }} suffix="%" domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, 'Readmission Probability']} labelFormatter={(l) => `Patient: ${l}`} contentStyle={tooltipStyle} />
              <Bar dataKey="readmissionProbability" radius={[6, 6, 0, 0]} barSize={36}>
                {chartPatients.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={(entry.readmissionProbability || 0) > 70 ? '#ef4444' : (entry.readmissionProbability || 0) > 40 ? '#f59e0b' : '#d4d4d8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Patients Table + Decision Hub */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-4 hover:border-red-200 transition-all">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-800">Your Assigned Patients</h3>
              <p className="text-[11px] font-medium text-zinc-400">Click any patient to open their detailed clinical worksheet</p>
            </div>
            <Link to="/doctor/patients" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Patient ID</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Primary Diagnosis</th>
                  <th className="py-3 px-3 text-center">Risk Level</th>
                  <th className="py-3 px-3 text-center">Probability</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                {patients.slice(0, 6).map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/doctor/patients/${p.id}`)} className="hover:bg-zinc-50 transition-colors cursor-pointer">
                    <td className="py-3 px-3 font-bold text-zinc-400">{p.id}</td>
                    <td className="py-3 px-3 font-bold text-zinc-800">{p.name}</td>
                    <td className="py-3 px-3 text-zinc-500 max-w-[180px] truncate">{p.diagnosis}</td>
                    <td className="py-3 px-3 text-center"><RiskBadge risk={p.riskLevel} /></td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${(p.readmissionProbability || 0) > 70 ? 'text-red-600' : (p.readmissionProbability || 0) > 40 ? 'text-amber-600' : 'text-zinc-500'}`}>
                        {p.readmissionProbability}%
                      </span>
                    </td>
                    <td className="py-3 px-3"><StatusBadge status={p.treatmentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Decision Hub */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between hover:border-red-200 transition-all">
          <div className="space-y-4">
            <div className="border-b border-zinc-100 pb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-zinc-800">Decision Support Hub</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Review and validate AI-suggested risk mitigation protocols and discharge instructions for high-risk patients.
            </p>
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-red-700 block">Marcus Vance (82% Risk)</span>
                  <span className="text-[11px] text-red-500">Needs insulin titration & 48h nurse check.</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                <Activity className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-amber-700 block">Clara Oswald (76% Risk)</span>
                  <span className="text-[11px] text-zinc-500">Echocardiogram check & weight telemetry.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="w-full text-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" /> Register New Patient
            </button>
            <Link to="/doctor/clinical-insights" className="w-full text-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-2.5 transition border border-zinc-200 shadow-sm block">
              Review Clinical Insights
            </Link>
          </div>
        </div>
      </div>

      {/* Patient Creation Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Clinical Patient Record"
        size="md"
      >
        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Full Patient Name *
              </label>
              <input
                type="text"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
                placeholder="e.g. Clark Kent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Age (Years) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="125"
                  value={newPatient.age}
                  onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                  className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
                  placeholder="58"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Gender *
                </label>
                <select
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Primary Diagnosis *
              </label>
              <select
                value={newPatient.diagnosis}
                onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Type 2 Diabetes">Type 2 Diabetes</option>
                <option value="Congestive Heart Failure (CHF)">Congestive Heart Failure (CHF)</option>
                <option value="COPD Exacerbation">COPD Exacerbation</option>
                <option value="Severe Community-Acquired Pneumonia">Severe Community-Acquired Pneumonia</option>
                <option value="Acute Coronary Syndrome">Acute Coronary Syndrome</option>
                <option value="Chronic Kidney Disease (Stage 3/4)">Chronic Kidney Disease (Stage 3/4)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Risk Level
                </label>
                <select
                  value={newPatient.riskLevel}
                  onChange={(e) => setNewPatient({ ...newPatient, riskLevel: e.target.value })}
                  className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-700 focus:border-red-500 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="High">High Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="Low">Low Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Readmission Risk (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newPatient.readmissionProbability}
                  onChange={(e) => setNewPatient({ ...newPatient, readmissionProbability: e.target.value })}
                  className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-800 focus:border-red-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-red-700 hover:to-rose-800 transition disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DoctorDashboard;
