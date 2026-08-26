import React from 'react';
import PageHeader from '../../components/common/PageHeader';
import { Shield, Key, Eye } from 'lucide-react';

const RoleManagementPage = () => {
  const roles = [
    {
      role: 'Doctor',
      desc: 'Clinical staff providing care.',
      privileges: ['View Assigned Patient Profiles', 'Create Clinical Recommendations', 'Submit AI Decisions Support Feedback']
    },
    {
      role: 'Hospital Admin',
      desc: 'Wards management and hospital operations.',
      privileges: ['View Hospital Dashboard Analytics', 'Compare Wards Recoveries rates', 'Export Health Forecasting CSV Lists']
    },
    {
      role: 'Researcher',
      desc: 'Epidemiological studies and population tracking.',
      privileges: ['Access HIPAA Sanitized Cohorts', 'Plot Demographic Clusters & Distributions', 'Export Obscured Datasets Copies']
    },
    {
      role: 'System Admin',
      desc: 'Server administrators and registry controls.',
      privileges: ['Provision Staff Logins Credentials', 'Train / Evaluate XGBoost Models Weights', 'Query Complete Audit Trails Database']
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Role Capability Privileges Review" 
        description="Verify security permissions mapping to active directories and route clearances."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((r, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 hover:shadow-xs transition">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-violet-50 border border-violet-100/50 text-violet-605 flex items-center justify-center">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-805 text-sm">{r.role} Role</h4>
                <p className="text-[11px] text-slate-400 font-semibold">{r.desc}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-slate-400" /> Permitted Route Privileges
              </span>
              <ul className="list-inside list-disc text-xs space-y-1.5 text-slate-600 font-semibold pl-1.5">
                {r.privileges.map((p, pIdx) => <li key={pIdx}>{p}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleManagementPage;
