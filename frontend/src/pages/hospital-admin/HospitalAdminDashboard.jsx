import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { Link } from 'react-router-dom';
import { ShieldAlert, Award, FileText, ChevronRight, Bed, Users } from 'lucide-react';

const HospitalAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try { setLoading(true); const res = await analyticsService.getHospitalDashboardData(); setData(res); }
      catch (err) { setError(err); } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Analyzing hospital operational datasets and readmission telemetry..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const riskPieData = [
    { name: 'High Risk',   count: data.kpis.highRiskPatients || 184, percentage: 13, color: '#ef4444' },
    { name: 'Medium Risk', count: Math.round((data.kpis.totalPatients || 1420) * 0.32), percentage: 32, color: '#f59e0b' },
    { name: 'Low Risk',    count: Math.round((data.kpis.totalPatients || 1420) * 0.55), percentage: 55, color: '#d4d4d8' },
  ];

  const formattedDepartments = (data.departmentPerformance || []).map(dept => {
    let shortName = dept.department;
    if (shortName.includes('Endocrinology')) shortName = 'Endocrinology';
    if (shortName.includes('General')) shortName = 'General Med';
    return { ...dept, displayName: shortName };
  });

  const tooltipStyle = { borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e4e4e7', color: '#18181b', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="St. Jude Hospital Operations Dashboard"
        description="Hospital-wide clinical readmission benchmarks, departmental performance, and capacity utilization."
        actions={
          <Link to="/hospital-admin/reports" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-200 hover:from-red-700 hover:to-rose-800 transition hover:scale-102">
            <FileText className="h-4 w-4" /> Reports & Downloads
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Total Hospital Registry" value="1,420" icon={Users} color="slate" trend="+5.4%" trendType="neutral" subtitle="Active & tracked inpatient pool" />
        <DashboardCard title="Avg Readmission Rate" value="14.2%" icon={ShieldAlert} color="amber" trend="-1.8%" trendType="decrease" subtitle="Hospital-wide monthly benchmark" />
        <DashboardCard title="High Risk Patients" value="184" icon={Award} color="red" trend="13%" trendType="increase" subtitle="Require proactive discharge care" />
        <DashboardCard title="Hospital Bed Occupancy" value="81.3%" icon={Bed} color="red" trend="+2.1%" trendType="increase" subtitle="General ward capacity index" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:border-red-200 transition-all">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-800">Cohort Risk Categories</h3>
              <span className="text-[11px] font-semibold text-zinc-400">Current Inpatients</span>
            </div>
            <div className="h-56 relative flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="count">
                    {riskPieData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} Patients`, n]} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-zinc-900 leading-none">1,420</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Patients</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-around border-t border-zinc-100 pt-3 text-xs">
            {riskPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-bold text-zinc-700">{item.name}</span>
                <span className="text-[11px] font-semibold text-zinc-400">({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col space-y-4 lg:col-span-2 hover:border-red-200 transition-all">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-800">Readmission Rate by Department (%)</h3>
              <p className="text-[11px] font-medium text-zinc-400">Comparing observed rate vs 12.0% hospital target</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span className="h-3 w-3 rounded-sm bg-gradient-to-t from-red-600 to-rose-500" /> Observed
              </span>
              <span className="flex items-center gap-1.5 text-red-500">
                <span className="h-0.5 w-4 bg-red-500 border-dashed" /> Target (12%)
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedDepartments} margin={{ top: 15, right: 15, left: -20, bottom: 10 }}>
                <defs>
                  <linearGradient id="deptRedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="displayName" tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }} suffix="%" domain={[0, 20]} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, 'Readmission Rate']} labelFormatter={(l) => `Department: ${l}`} contentStyle={tooltipStyle} />
                <ReferenceLine y={12.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="readmissionRate" fill="url(#deptRedGradient)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4 hover:border-red-200 transition-all">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-800">Branch Department Performance Metrics</h3>
            <p className="text-[11px] font-medium text-zinc-400">Clinical recovery benchmarks and compliance ratings</p>
          </div>
          <Link to="/hospital-admin/performance" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
            Analyze clinics <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Department Clinic</th>
                <th className="py-3 px-4">Monitored Cohort</th>
                <th className="py-3 px-4 text-center">Readmission Rate</th>
                <th className="py-3 px-4 text-center">Recovery Progress</th>
                <th className="py-3 px-4">Ward Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
              {data.departmentPerformance.map((dept, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-800">{dept.department}</td>
                  <td className="py-3.5 px-4 text-zinc-500">{dept.patientCount} Patients</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded-md text-xs ${
                      dept.readmissionRate <= 13 ? 'text-zinc-600 bg-zinc-100 border border-zinc-200'
                        : dept.readmissionRate <= 15 ? 'text-amber-700 bg-amber-50 border border-amber-200'
                        : 'text-red-700 bg-red-50 border border-red-200'
                    }`}>
                      {dept.readmissionRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-red-600 to-rose-500 h-1.5 rounded-full" style={{ width: `${dept.recoveryRate}%` }} />
                      </div>
                      <span className="font-bold text-zinc-800 text-xs">{dept.recoveryRate}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      dept.readmissionRate <= 14 ? 'bg-zinc-100 text-zinc-600 border border-zinc-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {dept.readmissionRate <= 14 ? 'Benchmark Met' : 'Observation Watch'}
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

export default HospitalAdminDashboard;
