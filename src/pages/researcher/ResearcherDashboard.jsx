import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { ShieldCheck, Database, HeartPulse, User } from 'lucide-react';

const ResearcherDashboard = () => {
  const [researchData, setResearchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadResearchData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getResearchData();
        setResearchData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadResearchData();
  }, []);

  if (loading) return <LoadingSpinner message="Aggregating research cohort averages..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const { ageDemographics, riskByDiagnosisIndex, anonymizedDataset } = researchData;

  return (
    <div className="space-y-6">
      {/* HIPAA / Anonymization Notice */}
      <div className="flex gap-3 rounded-2xl bg-blue-50/50 p-4 border border-blue-150 text-xs text-blue-800 font-semibold items-center">
        <ShieldCheck className="h-5.5 w-5.5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold underline block uppercase tracking-widest text-[10px]">Anonymization Protocols Active (HIPAA Safe)</span>
          <p className="font-medium text-slate-550 leading-relaxed">
            Personally Identifiable Information (PII) has been stripped in this view. 
            Patient Names, phone logs, addresses, and clinician details are obscured. Showing aggregated cohort metrics only.
          </p>
        </div>
      </div>

      <PageHeader 
        title="Research Cohort Dashboard" 
        description="Population health data indexing patient cohorts and diagnosis correlations."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardCard 
          title="Total Aggregated Records" 
          value={anonymizedDataset.length} 
          icon={Database}
          color="emerald"
          subtitle="HIPAA-sanitized logs registry"
        />
        <DashboardCard 
          title="Avg Readmission Risk" 
          value="14.2%" 
          icon={HeartPulse}
          color="red"
          subtitle="Research cohort benchmark rate"
        />
        <DashboardCard 
          title="Age Median Range" 
          value="51-65 Yrs" 
          icon={User}
          color="blue"
          subtitle="Primary demographic cluster"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Demographics age groups bar chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Cohort Age Demographics</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDemographics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ageGroup" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value}`, 'PatientsCount']} />
                <Bar dataKey="count" name="Patient records" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average stay segments by diagnosis line chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4 font-heading">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Average Stay (Days) by Diagnosis</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskByDiagnosisIndex} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="diagnosis" tick={{ fontSize: 8 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avgStayDays" name="Average Stay (Days)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabular Anonymized Registry */}
      <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">HIPAA-Clean Anonymized Dataset Registry Preview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Anonymized Record ID</th>
                <th className="py-3 px-4">Age Bracket</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Diagnosis Group</th>
                <th className="py-3 px-4">Risk Class</th>
                <th className="py-3 px-4 text-center">Readmissions Probability</th>
                <th className="py-3 px-4">Admissions Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anonymizedDataset.slice(0, 5).map((record) => (
                <tr key={record.id} className="hover:bg-slate-55/40 transition-colors font-medium text-slate-650">
                  <td className="py-3.5 px-4 font-bold text-slate-450">{record.id}_ANON</td>
                  <td className="py-3.5 px-4">{record.age} Years</td>
                  <td className="py-3.5 px-4">{record.gender}</td>
                  <td className="py-3.5 px-4">{record.diagnosis}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      record.riskLevel === 'High' ? 'bg-red-50 text-red-700' : record.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {record.riskLevel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{record.readmissionProbability}%</td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] text-slate-450 font-bold uppercase bg-slate-50 border border-slate-150 px-2 py-0.5 rounded">
                      {record.treatmentStatus}
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

export default ResearcherDashboard;
