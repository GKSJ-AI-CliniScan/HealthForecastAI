import React, { useState, useEffect } from 'react';
import { treatmentService } from '../../services/treatmentService';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Sparkles, Activity, ShieldAlert, Award, Pill, Download, CheckCircle2, 
  TrendingUp, BarChart3, Hospital, Layers, FileSpreadsheet
} from 'lucide-react';

const OutcomeAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await treatmentService.getTreatmentSummary();
        setData(res);

        const hfcAnalytics = await analyticsService.getDashboardAnalytics();
        setAnalytics(hfcAnalytics);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleExportOutcomeReport = () => {
    setExporting(true);
    setTimeout(() => {
      const rows = [
        ["HealthForecast AI — Hospital Outcome Analytics & Performance Report"],
        ["Generated Date", new Date().toLocaleString()],
        ["Hospital Rating", "4.8 / 5.0"],
        ["Recovery Index", `${data.recoveryRate}%`],
        ["Therapeutic Efficacy", `${data.successRate}%`],
        [],
        ["Department", "Patient Volume", "Readmission Rate (%)", "Recovery Rate (%)"],
        ["Cardiology", "420", "16.8%", "85.2%"],
        ["Endocrinology", "350", "15.2%", "87.5%"],
        ["Pulmonology", "280", "13.4%", "89.1%"],
        ["General Medicine", "370", "11.2%", "91.8%"]
      ];

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `HealthForecast_Outcome_Analytics_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExporting(false);
      setExportedSuccess(true);
      setTimeout(() => setExportedSuccess(false), 4000);
    }, 800);
  };

  if (loading) return <LoadingSpinner message="Evaluating outcome analytics & hospital metrics..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const formattedMedData = (data.medicationsData || []).map(med => ({
    ...med,
    shortTreatment: med.treatment.split('(')[0].trim(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Patient Outcome Analytics & Performance Intelligence" 
        description="Milestone 3: Healthcare performance dashboards, patient recovery metrics, and outcome reporting."
      />

      {/* Action Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Hospital className="h-5 w-5 text-red-600" />
          <span className="text-xs font-bold text-slate-800">St. Jude Medical Center • Health Outcomes Monitoring</span>
        </div>

        <button
          onClick={handleExportOutcomeReport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm disabled:opacity-50"
        >
          {exporting ? (
            <span>Exporting CSV...</span>
          ) : exportedSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Report Exported!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Generate Outcome Report</span>
            </>
          )}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Clinical Recovery Index" 
          value={`${data.recoveryRate}%`} 
          icon={Activity}
          color="emerald"
          trend="+3.2%"
          trendType="increase"
          subtitle="Inpatients achieving discharge milestones"
        />
        <DashboardCard 
          title="Therapeutic Efficacy" 
          value={`${data.successRate}%`} 
          icon={Award}
          color="blue"
          trend="+1.8%"
          trendType="increase"
          subtitle="Treatments satisfying goal timelines"
        />
        <DashboardCard 
          title="Complication Index" 
          value="4.1%" 
          icon={ShieldAlert}
          color="red"
          trend="-0.6%"
          trendType="decrease"
          subtitle="Reported drug side effects rate"
        />
        <DashboardCard 
          title="Hospital Benchmark Rating" 
          value="4.8 / 5" 
          icon={Sparkles}
          color="amber"
          subtitle="Overall quality audit score"
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department Performance Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-850 font-heading">Recovery vs Readmission Rate by Department</h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Department Comparison
            </span>
          </div>
          <div className="h-64 flex-1 font-heading">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.departmentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} suffix="%" />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="recoveryRate" name="Recovery Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="readmissionRate" name="Readmission Rate (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficacy & Adverse Complication Rates by Medication Protocol */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-850 font-heading">Protocol Efficacy vs Side Effects (%)</h3>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Drug Audit Matrix
            </span>
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedMedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortTreatment" tick={{ fontSize: 9 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} suffix="%" />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="successRate" name="Efficacy Success (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sideEffectsRate" name="Complications (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutcomeAnalyticsPage;
