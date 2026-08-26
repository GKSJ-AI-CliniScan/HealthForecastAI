import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import { Activity, ShieldAlert, Award, FileText, ChevronRight } from 'lucide-react';

const HospitalAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await analyticsService.getHospitalDashboardData();
        setData(res);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Analysing St. Jude Hospital operational datasets..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="St. Jude Analytics Dashboard" 
        description="Hospital-wide stats, readmissions averages, and department capacities."
        actions={
          <Link 
            to="/hospital-admin/reports" 
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
          >
            <FileText className="h-4 w-4" /> Reports & Downloads
          </Link>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Total Hospital Registry" 
          value={data.kpis.totalPatients} 
          icon={Activity}
          color="emerald"
          subtitle="Active + discharged tracking pool"
        />
        <DashboardCard 
          title="Avg Readmission Rate" 
          value={`${data.kpis.averageReadmissionRate}%`} 
          icon={ShieldAlert}
          color="red"
          subtitle="Hospital-wide benchmark"
        />
        <DashboardCard 
          title="High Risk Registry" 
          value={data.kpis.highRiskPatients} 
          icon={Award}
          color="amber"
          subtitle="Require constant nursing alerts"
        />
        <DashboardCard 
          title="Hospital Bed Occupancy" 
          value={`${data.kpis.avgBedOccupancy}%`} 
          icon={Activity}
          color="blue"
          subtitle="General ward capability index"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Risk breakdown pie chart */}
        <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm flex flex-col space-y-4 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Cohort Risk Categories</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Patients`]} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Readmission by Department bar chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-805 border-b border-slate-100 pb-2 font-heading">Readmission Rate by Department</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.departmentPerformance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} suffix="%" />
                <Tooltip formatter={(value) => [`${value}%`, 'Readmission Rate']} />
                <Bar dataKey="readmissionRate" name="Readmission rate" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department comparisons tables */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Branch Department Performance Metrics</h3>
          <Link to="/hospital-admin/performance" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            Analyze clinics <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Department Clinic</th>
                <th className="py-3 px-4">Active Registry Size</th>
                <th className="py-3 px-4 text-center">Readmission Rate</th>
                <th className="py-3 px-4 text-center">Target Recovery Rate</th>
                <th className="py-3 px-4">Ward Compliance Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.departmentPerformance.map((dept, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors font-semibold text-slate-600">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{dept.department}</td>
                  <td className="py-3.5 px-4">{dept.patientCount} Patient Profiles</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">{dept.readmissionRate}%</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{dept.recoveryRate}%</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      dept.readmissionRate < 14 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                      {dept.readmissionRate < 14 ? 'Standard check passed' : 'Needs observation watch'}
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
