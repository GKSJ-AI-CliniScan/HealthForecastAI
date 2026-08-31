import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Layers, Stethoscope, ArrowRight } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Card } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DashboardMetrics } from '@/types';

export const HospitalAdminDashboard: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  const navigate = useNavigate();
  const cards = metrics.cards || {};
  const recentAdmissions = metrics.recent_admissions || [];
  const deptSummary = metrics.department_summary || {};

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-sky-800 via-sky-700 to-indigo-700 text-white shadow-xl shadow-sky-950/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Hospital Operational Intelligence</h2>
          <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-xl">
            Hospital-wide inpatient volume, admission flows, departmental load metrics, and treatment summaries.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Hospital Patients"
          value={cards.total_patients ?? 0}
          subtitle="Cumulative registered clinical records"
          icon={Users}
          color="sky"
        />
        <StatCard
          title="Total Admissions"
          value={cards.total_admissions ?? 0}
          subtitle="All hospital admission episodes"
          icon={Building2}
          color="teal"
        />
        <StatCard
          title="Active Departments"
          value={cards.departments_count ?? Object.keys(deptSummary).length}
          subtitle="Specialty clinical divisions"
          icon={Layers}
          color="purple"
        />

        <StatCard
          title="Active Treatments"
          value={cards.active_treatments ?? 0}
          subtitle="Ongoing hospital therapies"
          icon={Stethoscope}
          color="emerald"
        />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Volume Summary */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Department Caseload</h3>
              <p className="text-xs text-slate-500">Distribution of admissions across clinical specialties</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(deptSummary).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No departmental data available.</p>
            ) : (
              Object.entries(deptSummary).map(([dept, count]) => (
                <div key={dept} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{dept}</span>
                  </div>
                  <Badge variant="sky">{count} Admissions</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Admissions */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Hospital Inflows</h3>
              <p className="text-xs text-slate-500">Latest admission records recorded across all departments</p>
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
                <TableHead>Date</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Stay (Days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                    No admission records found.
                  </TableCell>
                </TableRow>
              ) : (
                recentAdmissions.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs font-medium">{a.admission_date}</TableCell>
                    <TableCell>
                      <Badge variant="teal">{a.department || 'General'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]">{a.primary_diagnosis}</TableCell>
                    <TableCell className="text-xs font-semibold">{a.length_of_stay ?? 'Ongoing'}</TableCell>
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
