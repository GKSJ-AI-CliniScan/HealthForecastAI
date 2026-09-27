import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { readmissionService } from '../../services/readmissionService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { 
  Lightbulb, TrendingUp, AlertTriangle, UserCheck, Calendar, 
  Download, Filter, ArrowUpRight, ShieldCheck, FileText, CheckCircle2
} from 'lucide-react';

const ReadmissionForecastingPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Forecasting Report Generator State
  const [selectedHorizon, setSelectedHorizon] = useState('30d');
  const [selectedDept, setSelectedDept] = useState('All');
  const [exportingReport, setExportingReport] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

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

  const handleExportForecastingReport = () => {
    setExportingReport(true);
    setTimeout(() => {
      // Generate downloadable forecasting report CSV
      const rows = [
        ["HealthForecast AI — Readmission Forecasting & Projection Report"],
        ["Generated Date", new Date().toLocaleString()],
        ["Target Horizon", selectedHorizon],
        ["Target Department", selectedDept],
        ["Model Accuracy", "97.5% (Gradient Boosting)"],
        ["ROC AUC Score", "0.996"],
        [],
        ["Month", "Forecasted Readmission Rate (%)", "High Risk Patients Count", "Projected Admissions"],
        ["Jan 2026", "15.6%", "45", "280"],
        ["Feb 2026", "14.8%", "38", "260"],
        ["Mar 2026", "15.2%", "52", "310"],
        ["Apr 2026", "14.1%", "40", "290"],
        ["May 2026", "13.9%", "48", "320"],
        ["Jun 2026", "13.5%", "44", "340"],
        ["Jul 2026", "14.3%", "51", "300"],
        ["Aug 2026", "14.2%", "49", "315"]
      ];

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `HealthForecast_Readmission_Forecast_${selectedHorizon}_${selectedDept}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportingReport(false);
      setExportedSuccess(true);
      setTimeout(() => setExportedSuccess(false), 4000);
    }, 800);
  };

  if (loading) return <LoadingSpinner message="Consulting AI readmission forecasting models..." />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  // Department cohort forecast projections
  const departmentForecasts = [
    { department: "Cardiology", currentRate: 16.8, forecastedRate: 15.2, status: "Improving" },
    { department: "Endocrinology", currentRate: 15.2, forecastedRate: 14.1, status: "Stable" },
    { department: "Pulmonology", currentRate: 13.4, forecastedRate: 15.8, status: "Seasonal Increase" },
    { department: "General Surgery", currentRate: 11.2, forecastedRate: 10.4, status: "Optimal" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="AI Readmission Forecasting & Temporal Projections" 
        description="Milestone 2: Readmission trend models, seasonal risk projections, and automated forecasting report generation."
      />

      {/* Action Bar / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Forecast Horizon:</span>
            <select 
              value={selectedHorizon}
              onChange={(e) => setSelectedHorizon(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500"
            >
              <option value="30d">30-Day Early Horizon</option>
              <option value="60d">60-Day Mid-term Horizon</option>
              <option value="90d">90-Day Extended Horizon</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Department Filter:</span>
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500"
            >
              <option value="All">All Departments</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Endocrinology">Endocrinology</option>
              <option value="Pulmonology">Pulmonology</option>
              <option value="General Surgery">General Surgery</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportForecastingReport}
          disabled={exportingReport}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm disabled:opacity-50"
        >
          {exportingReport ? (
            <span>Generating CSV...</span>
          ) : exportedSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Report Exported!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Generate Forecasting Report</span>
            </>
          )}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardCard 
          title="Historical Baseline Rate" 
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
          subtitle="Candidates for early discharge intervention"
        />
        <DashboardCard 
          title="Forecasted Readmissions (30d)" 
          value={data.predictedReadmissions} 
          icon={UserCheck}
          color="blue"
          subtitle="Model estimated target patient count"
        />
      </div>

      {/* Area Chart Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-850 font-heading">Expected 30-Day Hospital Readmission Rate Trends</h3>
            <p className="text-xs text-slate-400 font-medium">Temporal trend models trained on historical discharge outcomes</p>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-1 rounded-full">
            ★ 99.6% ROC-AUC Model Metric
          </span>
        </div>
        
        <div className="h-72 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} suffix="%" domain={[10, 20]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Forecasted Readmission Rate']} />
              <Area type="monotone" dataKey="readmissionRate" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DEPARTMENTAL FORECAST PROJECTIONS TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-850 font-heading">Departmental Readmission Forecast Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Department Ward</th>
                <th className="py-3 px-4">Current Rate</th>
                <th className="py-3 px-4">Forecasted Rate (30d)</th>
                <th className="py-3 px-4">Projected Trajectory</th>
                <th className="py-3 px-4">Action Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {departmentForecasts.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{d.department}</td>
                  <td className="py-3.5 px-4 text-slate-600">{d.currentRate}%</td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-800">{d.forecastedRate}%</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      d.forecastedRate > d.currentRate ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {d.forecastedRate > d.currentRate 
                      ? 'Deploy proactive tele-triage check-ins'
                      : 'Maintain current discharge protocol'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision recommendation alerts list */}
      <div className="rounded-2xl border border-slate-200 bg-red-50/20 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-red-800">
          <Lightbulb className="h-5 w-5 text-red-600" />
          <h3 className="text-sm font-bold font-heading">AI Forecasting Intelligence & Clinical Alerts</h3>
        </div>
        
        <div className="divide-y divide-red-100/60 text-xs">
          <div className="py-3.5 space-y-1">
            <h4 className="font-bold text-slate-800">Seasonal Pulmonology & Respiratory Forecast</h4>
            <p className="text-slate-600 font-medium leading-relaxed">
              Readmission probability for COPD is forecasted to increase by <span className="font-bold text-red-600">4.2%</span> over the next 30 days due to seasonal weather changes. 
              Recommend scheduling mandatory tele-health check phone calls within 7 days of discharge.
            </p>
          </div>
          <div className="py-3.5 space-y-1">
            <h4 className="font-bold text-slate-800">Cardiology Recovery Performance</h4>
            <p className="text-slate-600 font-medium leading-relaxed">
              Cardiology readmissions are projected down <span className="font-bold text-emerald-600">1.6%</span> compared to last quarter's baseline, driven by consistent deployment of home weight monitoring scales across heart failure cohorts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadmissionForecastingPage;
