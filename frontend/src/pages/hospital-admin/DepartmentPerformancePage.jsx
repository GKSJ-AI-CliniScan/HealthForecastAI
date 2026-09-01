import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Timer, Sparkles } from 'lucide-react';

const DepartmentPerformancePage = () => {
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

  if (loading) return <LoadingSpinner message="Evaluating ward efficiencies..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Department Performance & Capacity Analysis" 
        description="Cross-clinical comparisons of patient volumes, readmission vectors, and recovery rates."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DashboardCard 
          title="Top Performing Clinic" 
          value="General Medicine" 
          icon={Sparkles}
          color="emerald"
          subtitle="Highest recovery rate rating at 91.8%"
        />
        <DashboardCard 
          title="Average Length of Stay" 
          value="6.2 Days" 
          icon={Timer}
          color="blue"
          subtitle="Hospital-wide median discharge index"
        />
      </div>

      {/* Chart: Patient distributions + readmissions by department */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col space-y-4">
        <h3 className="text-sm font-bold text-slate-805 border-b border-slate-100 pb-2">Active Patient Registry & Recovery Ratios</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.departmentPerformance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="department" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend iconType="circle" />
              <Bar dataKey="patientCount" name="Total Patients Monitored" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recoveryRate" name="Observed Recovery Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DepartmentPerformancePage;
