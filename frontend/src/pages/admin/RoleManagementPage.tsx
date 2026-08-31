import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';

import { ROLE_BADGE_COLORS, ROLE_LABELS } from '@/constants/roles';

export const RoleManagementPage: React.FC = () => {
  const { data: roles, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminApi.listRoles,
  });

  const rolePermissions: Record<string, { permissions: string[]; restrictions: string[] }> = {
    DOCTOR: {
      permissions: [
        'Access assigned patient clinical files',
        'Create & update patient records',
        'Log medical histories & diagnoses',
        'Prescribe therapeutic treatments',
        'Access Doctor Command Center',
      ],
      restrictions: [
        'Cannot access unassigned patients',
        'Cannot manage user accounts',
        'Cannot alter global roles',
      ],
    },
    HOSPITAL_ADMIN: {
      permissions: [
        'View hospital-wide patient volume',
        'View department admission summaries',
        'Create patient hospital admissions',
        'Access Hospital Operations Dashboard',
      ],
      restrictions: [
        'Cannot modify physician clinical diagnoses',
        'Cannot manage system configuration',
      ],
    },
    RESEARCHER: {
      permissions: [
        'Access de-identified patient cohorts',
        'Query aggregated health statistics',
        'Inspect Diabetes 130-US Hospitals dataset',
        'Access Population Research Dashboard',
      ],
      restrictions: [
        'Strictly blocked from patient names & contact PII',
        'Cannot access patient street addresses or exact DOB',
        'Cannot edit or delete patient records',
      ],
    },
    SYSTEM_ADMIN: {
      permissions: [
        'Provision, update, and deactivate user accounts',
        'Assign doctors to patient clinical cohorts',
        'Inspect live security audit logs',
        'Access all system views & dataset pipeline',
      ],
      restrictions: ['Full unrestricted governance'],
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role-Based Access Control (RBAC)"
        subtitle="Review authorization boundaries, permission scopes, and privacy safeguards across all 4 system roles."
      />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : isError ? (
        <ErrorAlert message="Failed to load roles." onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles?.map((r) => {
            const style = ROLE_BADGE_COLORS[r.name as keyof typeof ROLE_BADGE_COLORS] || ROLE_BADGE_COLORS.DOCTOR;
            const details = rolePermissions[r.name] || { permissions: [], restrictions: [] };

            return (
              <Card key={r.id} className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                        {r.name}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {ROLE_LABELS[r.name as keyof typeof ROLE_LABELS] || r.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                  </div>
                </div>

                {/* Permissions List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Authorized Capabilities
                  </span>
                  <div className="space-y-1.5">
                    {details.permissions.map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Restrictions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Security Restrictions
                  </span>
                  <div className="space-y-1.5">
                    {details.restrictions.map((res, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <span>{res}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
