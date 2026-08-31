import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, ShieldCheck, Activity, ArrowRight, UserPlus } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Card } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DashboardMetrics } from '@/types';
import { ROLE_BADGE_COLORS, ROLE_LABELS } from '@/constants/roles';

export const SystemAdminDashboard: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  const navigate = useNavigate();
  const cards = metrics.cards || {};
  const recentUsers = metrics.recent_users || [];
  const recentLogs = metrics.recent_audit_logs || [];

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white shadow-xl shadow-slate-950/20 border border-slate-700/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">System Administration & Security Control</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Manage system users, role allocations, doctor assignments, and monitor continuous platform audit events.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="glass"
            size="sm"
            onClick={() => navigate('/admin/users')}
            icon={UserPlus}
          >
            Manage Users
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Users"
          value={cards.total_users ?? 0}
          subtitle="Provisioned clinician & admin accounts"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Active Accounts"
          value={cards.active_users ?? 0}
          subtitle="Operational user profiles"
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          title="Total Registered Patients"
          value={cards.total_patients ?? 0}
          subtitle="Hospital patient registry"
          icon={ShieldCheck}
          color="sky"
        />
        <StatCard
          title="System Audit Events"
          value={cards.audit_events_count ?? 0}
          subtitle="Recorded security log entries"
          icon={Activity}
          color="rose"
        />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Users</h3>
              <p className="text-xs text-slate-500">Latest active users registered on the platform</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/users')}
              icon={ArrowRight}
              iconPosition="right"
            >
              All Users
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                recentUsers.map((u: any) => {
                  const badge = ROLE_BADGE_COLORS[u.role as keyof typeof ROLE_BADGE_COLORS] || ROLE_BADGE_COLORS.DOCTOR;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{u.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'emerald' : 'slate'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/admin/users')}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Live Audit Log Stream */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Live Security Audit Log</h3>
              <p className="text-xs text-slate-500">Security actions tracked with timestamps</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/audit-logs')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Full Log
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                    No audit records recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-semibold text-xs">{l.username || 'System'}</TableCell>
                    <TableCell>
                      <Badge variant="slate">{l.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {l.resource || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};
