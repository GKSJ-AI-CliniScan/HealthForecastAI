import React from 'react';
import { Mail, ShieldCheck, Activity } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ROLE_BADGE_COLORS, ROLE_LABELS } from '@/constants/roles';

export const UserProfilePage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const roleStyle = ROLE_BADGE_COLORS[user.role] || ROLE_BADGE_COLORS.DOCTOR;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="User Account Profile"
        subtitle="Manage your platform credentials, active role permissions, and session security."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="text-center p-6 space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
            {user.first_name?.[0]}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user.full_name}</h3>
            <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
          </div>
          <div>
            <span
              className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
            >
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
        </Card>

        {/* Details Card */}
        <Card className="md:col-span-2 space-y-5 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Account Details</h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-500 flex items-center gap-2 font-medium">
                <Mail className="w-4 h-4 text-slate-400" />
                Email Address
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{user.email}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-500 flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                Assigned RBAC Role
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user.role}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-500 flex items-center gap-2 font-medium">
                <Activity className="w-4 h-4 text-slate-400" />
                Account Status
              </span>
              <Badge variant={user.is_active ? 'emerald' : 'rose'}>
                {user.is_active ? 'Active & Verified' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
