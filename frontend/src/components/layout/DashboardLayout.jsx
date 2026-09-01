import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Activity, FileText, Brain, TrendingUp,
  Settings, ShieldAlert, Database, Bell, Menu, X, ChevronDown,
  ChevronRight, LogOut, HeartPulse, Sparkles
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 1, text: "High readmission risk flagged for Marcus Vance (82%)", time: "10m ago", read: false },
    { id: 2, text: "August readmission rate decreased to 14.2% (Target: 12%)", time: "1h ago", read: false },
    { id: 3, text: "Cardiology department bed occupancy reached 88%", time: "3h ago", read: true },
    { id: 4, text: "Monthly clinical analytics report compiled and ready for download", time: "1d ago", read: true }
  ]);

  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));
  const activeNotificationCount = notifications.filter(n => !n.read).length;

  const menuConfigs = {
    doctor: [
      { name: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
      { name: 'Assigned Patients', path: '/doctor/patients', icon: Users },
      { name: 'Risk Predictions', path: '/doctor/risk-predictions', icon: ShieldAlert },
      { name: 'Readmission Forecasts', path: '/doctor/readmission', icon: TrendingUp },
      { name: 'Treatment Effectiveness', path: '/doctor/treatment-effectiveness', icon: Activity },
      { name: 'Clinical Insights', path: '/doctor/clinical-insights', icon: Brain },
    ],
    'hospital-admin': [
      { name: 'Hospital Dashboard', path: '/hospital-admin/dashboard', icon: LayoutDashboard },
      { name: 'Outcome Analytics', path: '/hospital-admin/analytics', icon: Activity },
      { name: 'Department Performance', path: '/hospital-admin/performance', icon: TrendingUp },
      { name: 'Reports & Export', path: '/hospital-admin/reports', icon: FileText },
    ],
    researcher: [
      { name: 'Research Dashboard', path: '/researcher/dashboard', icon: LayoutDashboard },
      { name: 'Population Health', path: '/researcher/population-health', icon: HeartPulse },
      { name: 'Readmission Trends', path: '/researcher/readmission-trends', icon: TrendingUp },
      { name: 'Research Datasets', path: '/researcher/datasets', icon: Database },
    ],
    'system-admin': [
      { name: 'System Dashboard', path: '/system-admin/dashboard', icon: LayoutDashboard },
      { name: 'User Management', path: '/system-admin/users', icon: Users },
      { name: 'Role Management', path: '/system-admin/roles', icon: Settings },
      { name: 'Dataset Management', path: '/system-admin/datasets', icon: Database },
      { name: 'AI Models', path: '/system-admin/models', icon: Brain },
      { name: 'Audit Logs', path: '/system-admin/audit-logs', icon: FileText },
      { name: 'System Settings', path: '/system-admin/settings', icon: Settings },
    ]
  };

  const currentMenu = menuConfigs[role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatBreadcrumbName = (str) => {
    const specialMap = {
      'hospital-admin': 'Hospital Admin', 'system-admin': 'System Admin',
      'doctor': 'Doctor Portal', 'researcher': 'Researcher Portal',
      'dashboard': 'Dashboard', 'performance': 'Department Performance',
      'analytics': 'Outcome Analytics', 'reports': 'Reports & Export',
      'patients': 'Patients Registry', 'readmission': 'Readmission Forecasting',
      'risk-predictions': 'Risk Predictions', 'treatment-effectiveness': 'Treatment Effectiveness',
      'clinical-insights': 'Clinical Insights', 'population-health': 'Population Health',
      'readmission-trends': 'Readmission Trends', 'datasets': 'Research Datasets',
      'users': 'User Management', 'roles': 'Role Management',
      'models': 'AI Model Management', 'audit-logs': 'Audit Logs', 'settings': 'Settings'
    };
    if (specialMap[str.toLowerCase()]) return specialMap[str.toLowerCase()];
    return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const url = `/${pathParts.slice(0, index + 1).join('/')}`;
    return { name: formatBreadcrumbName(part), url, isLast: index === pathParts.length - 1 };
  });

  const getRoleDisplayName = (r) => ({
    'doctor': 'Doctor / Clinician',
    'hospital-admin': 'Hospital Administrator',
    'researcher': 'Healthcare Researcher',
    'system-admin': 'System Administrator'
  }[r] || 'Medical Staff');

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans text-zinc-800 selection:bg-red-600 selection:text-white">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar (White) ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Branding */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-5 bg-white">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 text-white shadow-md shadow-red-200 group-hover:scale-105 transition-transform">
              <HeartPulse className="h-5 w-5 animate-pulse" />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-zinc-900 leading-none tracking-tight text-sm">
                St. Jude <span className="text-red-600">AI</span>
              </span>
              <span className="text-[9px] font-bold text-zinc-400 tracking-wider uppercase mt-0.5">Clinical Telemetry Hub</span>
            </div>
          </Link>
          <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <div className="mb-2.5 px-3 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
              {role?.replace('-', ' ')} Hub
            </span>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </div>

          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm translate-x-1'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border border-transparent'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-red-600' : 'text-zinc-400'}`} />
                <span className="truncate">{item.name}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="border-t border-zinc-100 p-3.5 bg-white">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-2.5 border border-zinc-200 shadow-sm">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
              alt={user?.name}
              className="h-9 w-9 rounded-lg object-cover border border-zinc-200 ring-2 ring-red-500/20"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-zinc-800 leading-tight">{user?.name || 'Authorized Staff'}</p>
              <p className="truncate text-[10px] text-zinc-400 font-semibold uppercase">{getRoleDisplayName(user?.role)}</p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Sign Out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main wrapper ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-zinc-50">

        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white/90 backdrop-blur-md px-6 shadow-sm z-30">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="hidden items-center gap-1.5 text-xs text-zinc-400 sm:flex">
              <span className="font-bold text-zinc-400 hover:text-zinc-600 transition-colors">Portal</span>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.url}>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300 stroke-[2.5]" />
                  <Link
                    to={crumb.url}
                    className={`font-bold transition-colors ${crumb.isLast ? 'text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200' : 'text-zinc-400 hover:text-red-600'}`}
                  >
                    {crumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Live EHR chip */}
            <div className="hidden md:flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600 border border-red-200 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              🔴 Live EHR Stream Online
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                className="relative rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 border border-zinc-200 bg-white transition"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {activeNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white shadow-md ring-2 ring-white">
                    {activeNotificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-xl z-50">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-2">
                      <span className="text-xs font-extrabold text-zinc-800 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-red-500" /> Notifications
                      </span>
                      <button onClick={markAllRead} className="text-[11px] font-bold text-red-600 hover:text-red-700 transition">Mark all read</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1.5 space-y-1">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`flex flex-col gap-1 rounded-xl px-3.5 py-2.5 text-xs transition-colors hover:bg-zinc-50 ${!notif.read ? 'bg-red-50 border border-red-100' : 'border border-transparent'}`}>
                          <span className={`font-semibold leading-relaxed ${!notif.read ? 'text-zinc-800' : 'text-zinc-500'}`}>{notif.text}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">{notif.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl p-1.5 text-left text-xs font-bold hover:bg-zinc-100 transition border border-zinc-200 bg-white"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <img
                  src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                  alt={user?.name}
                  className="h-7 w-7 rounded-lg object-cover ring-2 ring-red-500/20"
                />
                <span className="hidden select-none text-zinc-700 md:inline font-bold">{user?.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl z-50">
                    <div className="px-3 py-2 text-xs border-b border-zinc-100">
                      <p className="font-bold text-zinc-800 truncate">{user?.name}</p>
                      <p className="text-[10px] text-zinc-400 font-semibold truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); handleLogout(); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left transition"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50">
          <div className="mx-auto max-w-7xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
