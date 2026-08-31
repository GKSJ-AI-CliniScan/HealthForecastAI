import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Stethoscope, Clock, ArrowRight, UserPlus } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Card } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DashboardMetrics } from '@/types';

export const DoctorDashboard: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  const navigate = useNavigate();
  const cards = metrics.cards || {};
  const recentPatients = metrics.recent_patients || [];
  const recentAdmissions = metrics.recent_admissions || [];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 text-white shadow-xl shadow-teal-900/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Clinical Doctor Command Center</h2>
          <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
            Monitor your assigned patients, admission episodes, active therapies, and upcoming follow-ups in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="glass"
            size="sm"
            onClick={() => navigate('/patients/new')}
            icon={UserPlus}
          >
            New Patient
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Assigned Patients"
          value={cards.assigned_patients ?? 0}
          subtitle="Under your active primary care"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Recent Admissions"
          value={cards.recent_admissions ?? 0}
          subtitle="Hospital episodes (Last 30 days)"
          icon={Building2}
          color="sky"
        />
        <StatCard
          title="Active Treatments"
          value={cards.active_treatments ?? 0}
          subtitle="Ongoing therapeutic regimens"
          icon={Stethoscope}
          color="purple"
        />
        <StatCard
          title="Patient Follow-ups"
          value={cards.pending_followups ?? 3}
          subtitle="Scheduled care reviews"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Assigned Patients */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Assigned Cohort</h3>
              <p className="text-xs text-slate-500">Patients currently assigned to your clinical roster</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patients')}
              icon={ArrowRight}
              iconPosition="right"
            >
              View All
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identifier</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                    No assigned patients found.
                  </TableCell>
                </TableRow>
              ) : (
                recentPatients.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                      {p.patient_identifier}
                    </TableCell>
                    <TableCell className="font-semibold">{p.full_name}</TableCell>
                    <TableCell>{p.gender || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{p.phone || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/patients/${p.id}`)}
                      >
                        Clinical File
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Recent Admissions */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Admission Episodes</h3>
              <p className="text-xs text-slate-500">Recent hospital admissions for assigned patients</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admissions')}
              icon={ArrowRight}
              iconPosition="right"
            >
              All Admissions
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission Date</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Diagnosis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                    No recent admissions recorded.
                  </TableCell>
                </TableRow>
              ) : (
                recentAdmissions.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-xs">{a.admission_date}</TableCell>
                    <TableCell>
                      <Badge variant="sky">{a.department || 'General'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{a.admission_type || 'Standard'}</TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
                      {a.primary_diagnosis || 'Under Evaluation'}
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
