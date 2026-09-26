import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { Shield, Search, Filter } from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSystemDashboard();
      setLogs(res.recentLogs);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (loading) return <LoadingSpinner message="Querying PostgreSQL operations logs..." />;
  if (error) return <ErrorState error={error} onRetry={loadLogs} />;

  // Filter logs matches
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || log.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Security Audit Trails logs" 
        description="Review operational logs of model deployments, dataset changes, and user status toggles."
      />

      {/* Query Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search phrase */}
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by User identity, Log Action status, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-xl border border-slate-205 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Role filter Criteria */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Filter className="h-4 w-4" />
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">Filter: All Roles</option>
              <option value="doctor">Filter: Doctors Only</option>
              <option value="hospital-admin">Filter: Hospital Admins Only</option>
              <option value="system-admin">Filter: System Admins Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table Output */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-55/30 text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6 font-heading">Active Log ID</th>
                <th className="py-4 px-6">Operator User</th>
                <th className="py-4 px-6">System Sector / Action</th>
                <th className="py-4 px-6">Operations details log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors font-medium text-slate-650">
                  <td className="py-4 px-6 text-slate-400 font-semibold">{log.timestamp}</td>
                  <td className="py-4 px-6 font-bold text-slate-500">AUDIT_{log.id}</td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800">{log.user}</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">{log.role}</div>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-800 capitalize">{log.action}</td>
                  <td className="py-4 px-6 max-w-sm truncate leading-relaxed">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
