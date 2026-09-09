import React, { useState, useEffect } from 'react';
import { treatmentService } from '../../services/treatmentService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { 
  Activity, ShieldAlert, Award, Star, Pill, Download, CheckCircle2, 
  TrendingUp, Stethoscope, Sparkles, Filter, FileSpreadsheet
} from 'lucide-react';

const TreatmentEffectivenessPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Treatment Outcome Report Exporter State
  const [selectedDisease, setSelectedDisease] = useState('All');
  const [exportingReport, setExportingReport] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  // Active Medication Evaluation Interactive Filter
  const [medFilter, setMedFilter] = useState('all');

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

  const handleExportTreatmentReport = () => {
    setExportingReport(true);
    setTimeout(() => {
      const rows = [
        ["HealthForecast AI — Treatment Effectiveness & Medication Outcome Report"],
        ["Generated Date", new Date().toLocaleString()],
        ["Disease Filter", selectedDisease],
        ["Overall Success Rate", `${data.successRate}%`],
        ["Patient Recovery Rate", `${data.recoveryRate}%`],
        [],
        ["Treatment Protocol", "Clinical Efficacy Rate (%)", "Complication Rate (%)", "Observed Patients Count", "Evaluation Rating"],
        ["Insulin Glargine (Diabetes)", "85%", "4%", "350", "High Efficacy"],
        ["Furosemide IV (Heart Failure)", "82%", "8%", "420", "Moderate Efficacy"],
        ["Nebulizer Steroids (COPD)", "88%", "5%", "280", "High Efficacy"],
        ["Ceftriaxone IV (Pneumonia)", "94%", "2%", "328", "Excellent Efficacy"],
        ["Laparoscopic Excision (Appendicitis)", "97%", "1%", "140", "Excellent Efficacy"]
      ];

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `HealthForecast_Treatment_Effectiveness_Report_${selectedDisease}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportingReport(false);
      setExportedSuccess(true);
      setTimeout(() => setExportedSuccess(false), 4000);
    }, 800);
  };

  if (loading) return <LoadingSpinner message="Calculating treatment effectiveness & medication outcome matrices..." />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  // Multi-dimensional Treatment Efficacy Metrics (Milestone 3 Radar Chart)
  const radarData = [
    { subject: 'Glycemic Control', Insulin: 88, Standard: 70 },
    { subject: 'Fluid Balance', Furosemide: 84, Standard: 65 },
    { subject: 'Airway Flow', Steroids: 90, Standard: 72 },
    { subject: 'Infection Clearance', Antibiotics: 95, Standard: 80 },
    { subject: 'Surgical Recovery', Laparoscopy: 98, Standard: 85 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Treatment Effectiveness & Medication Outcome Analytics" 
        description="Milestone 3: Treatment evaluation workflows, drug regimen outcome analysis, and patient recovery monitoring."
      />

      {/* Action Bar / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Filter Disease Group:</span>
            <select 
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500"
            >
              <option value="All">All Diagnostic Groups</option>
              <option value="Diabetes">Type 2 Diabetes Mellitus</option>
              <option value="CHF">Congestive Heart Failure</option>
              <option value="COPD">COPD Exacerbation</option>
              <option value="Pneumonia">Community-Acquired Pneumonia</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportTreatmentReport}
          disabled={exportingReport}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm disabled:opacity-50"
        >
          {exportingReport ? (
            <span>Exporting CSV...</span>
          ) : exportedSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Report Exported!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export Treatment Report</span>
            </>
          )}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardCard 
          title="Overall Treatment Success" 
          value={`${data.successRate}%`} 
          icon={Award}
          color="emerald"
          subtitle="Treatments satisfying target recovery goals"
        />
        <DashboardCard 
          title="Patient Recovery Rate" 
          value={`${data.recoveryRate}%`} 
          icon={Activity}
          color="blue"
          subtitle="Milestones achieved without complications"
        />
        <DashboardCard 
          title="Therapy Index Rating" 
          value="A+ Grade" 
          icon={Star}
          color="violet"
          subtitle="Hospital-wide medical audit rating"
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recovery Progress Trend Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-850 font-heading">Patient Recovery Trajectory by Specialty</h3>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Longitudinal Monitoring
            </span>
          </div>
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

        {/* Medication Efficacy & Side Effects Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-850 font-heading">Medication Efficacy vs Complication Rate</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Drug Outcome Analysis
            </span>
          </div>
          <div className="h-64 flex-1 font-heading">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.medicationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="treatment" tick={{ fontSize: 8 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="successRate" name="Clinical Success (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sideEffectsRate" name="Side Effects (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MEDICATION OUTCOME ANALYSIS MATRIX */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-850 font-heading">Medication Outcome Analysis & Protocol Efficacy</h3>
            <p className="text-xs text-slate-400 font-medium">Evaluation metrics across primary pharmaceutical regimens</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-2">Filter:</span>
            <button 
              onClick={() => setMedFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                medFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setMedFilter('high')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                medFilter === 'high' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Success &gt; 85%
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Treatment Protocol</th>
                <th className="py-3 px-4">Clinical Indication</th>
                <th className="py-3 px-4 text-center">Success Rate</th>
                <th className="py-3 px-4 text-center">Side Effects Rate</th>
                <th className="py-3 px-4">Adherence Grade</th>
                <th className="py-3 px-4">Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.medicationsData
                .filter(m => medFilter === 'all' || m.successRate >= 85)
                .map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Pill className="h-4 w-4 text-red-600" />
                      <span>{m.treatment}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">General & Speciality Care Wards</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-extrabold">{m.successRate}%</td>
                    <td className="py-3.5 px-4 text-center text-red-500 font-bold">{m.sideEffectsRate}%</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">High Adherence (94%)</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        m.successRate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {m.successRate >= 90 ? '★ Optimal Outcome' : 'Good Response'}
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
