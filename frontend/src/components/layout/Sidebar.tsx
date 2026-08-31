import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  Stethoscope,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  Database,
  Activity,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_BADGE_COLORS, ROLE_LABELS } from '@/constants/roles';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const role = user?.role || 'DOCTOR';

  const commonNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Medical Records', path: '/medical-records', icon: FileText },
    { name: 'Admissions', path: '/admissions', icon: Building2 },
    { name: 'Treatments', path: '/treatments', icon: Stethoscope },
  ];

  const adminNav = [
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Role Management', path: '/admin/roles', icon: ShieldCheck },
    { name: 'Doctor Assignments', path: '/admin/assignments', icon: UserCheck },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: ClipboardList },
    { name: 'Dataset Pipeline', path: '/admin/dataset', icon: Database },
  ];

  const roleBadgeStyle = user?.role ? ROLE_BADGE_COLORS[user.role] : ROLE_BADGE_COLORS.DOCTOR;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-md shadow-teal-500/25">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              HealthForecast <span className="text-teal-600 dark:text-teal-400">AI</span>
            </h1>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Clinical Intelligence
            </p>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {user.first_name?.[0] || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user.full_name}
                </p>
                <div className="mt-0.5">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadgeStyle.bg} ${roleBadgeStyle.text} ${roleBadgeStyle.border}`}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Clinical Platform
            </p>
            <nav className="space-y-1">
              {commonNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/20 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* System Admin Section */}
          {role === 'SYSTEM_ADMIN' && (
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Administration
              </p>
              <nav className="space-y-1">
                {adminNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/20 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Footer with Logout */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
