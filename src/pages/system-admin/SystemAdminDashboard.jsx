import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { Cpu, Users, Layers, ShieldAlert, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SystemAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAdminDashboard = async () => {
      try {
        setLoading(true);
        const res = await adminService.getSystemDashboard();
        setData(res);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadAdminDashboard();
  }, []);

  if (loading) return <LoadingSpinner message="Querying system telemetry tables..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Predictive System Control Panel" 
        description="Overall server instances status, trained ML weights, active directories, and audit logging."
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Active Users" 
          value={data.usersCount} 
          icon={Users}
          color="emerald"
          subtitle="Registered staff directories"
        />
        <DashboardCard 
          title="Trained AI Models" 
          value={data.modelsCount} 
          icon={Cpu}
          color="blue"
          subtitle="XGBoost Classifier pipelines"
        />
        <DashboardCard 
          title="Total Datasets" 
          value={data.datasetsCount} 
          icon={Layers}
          color="violet"
          subtitle="Uploaded CSV source matrices"
        />
        <DashboardCard 
          title="Security Actions" 
          value={data.logsCount} 
          icon={ShieldAlert}
          color="amber"
          subtitle="Audit trails logged in database"
        />
      </div>

      {/* Main Grid: Recent activities + Systems Telemetry indicators */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Audit Logs trail */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Security Audit Trail Activities</h3>
            <Link to="/system-admin/audit-logs" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View Log Index <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {data.recentLogs.map((log) => (
              <div key={log.id} className="flex gap-4 p-3 border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                  L
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700 capitalize">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    User: <span className="font-bold text-slate-600">{log.user}</span> ({log.role}) • Action Details: {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI System Weights Overview */}
        <div className="rounded-2xl border border-slate-200 bg-amber-50/10 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4 font-heading">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-amber-805">
              <Cpu className="h-5 w-5 text-amber-600 animate-pulse" />
              <h3 className="text-sm font-bold font-heading">Target AI Models Registry</h3>
            </div>
            <div className="space-y-4 text-xs font-medium text-slate-600">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>XGBoost Readmission Classifier</span>
                <span className="font-bold text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded">Deployed</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>Neural Net Length of Stay Estimator</span>
                <span className="font-bold text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded">Trained</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>Random Forest Diabetes Predictor</span>
                <span className="font-bold text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded">Deployed</span>
              </div>
            </div>
          </div>
          <Link
            to="/system-admin/models"
            className="mt-6 block text-center rounded-xl bg-slate-50 py-3 text-xs font-bold text-slate-605 hover:bg-slate-100 hover:text-emerald-650 transition"
          >
            Train / Deploy Models
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SystemAdminDashboard;
