import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Brain,
  TrendingUp,
  Settings,
  ShieldAlert,
  Database,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  HeartPulse,
  RefreshCw,
  Search
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Custom mock notifications
  const [notifications, setNotifications] = useState([
    { id: 1, text: "High readmission risk detected for Marcus Vance (82%)", time: "10m ago", read: false },
    { id: 2, text: "AI Model XGBoost v2.5.1 deployed successfully to production", time: "2h ago", read: false },
    { id: 3, text: "New dataset St. Jude ICU Readmissions v1.4 processed", time: "1d ago", read: true }
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const activeNotificationCount = notifications.filter(n => !n.read).length;

  // Sidebar links configuration based on role
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
      { name: 'AI Model Management', path: '/system-admin/models', icon: Brain },
      { name: 'Audit Logs', path: '/system-admin/audit-logs', icon: FileText },
      { name: 'System Settings', path: '/system-admin/settings', icon: Settings },
    ]
  };

  // Allow System Admin to toggle between dashboards for testing
  const adminJumpLinks = [
    { label: "Doctor Portal", path: "/doctor/dashboard" },
    { label: "Admin Portal", path: "/hospital-admin/dashboard" },
    { label: "Research Portal", path: "/researcher/dashboard" },
    { label: "SysAdmin Portal", path: "/system-admin/dashboard" }
  ];

  const currentMenu = menuConfigs[role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Generate Breadcrumbs
  const pathParts = location.pathname.split('/').filter(p => p);
  const breadcrumbs = pathParts.map((part, index) => {
    const url = `/${pathParts.slice(0, index + 1).join('/')}`;
    const displayName = part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' ');
    const isLast = index === pathParts.length - 1;
    return { name: displayName, url, isLast };
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Branding header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <HeartPulse className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 leading-tight tracking-tight text-lg">HealthForecast AI</span>
              <span className="text-[10px] font-semibold text-emerald-600 tracking-wider uppercase">Risk Intelligence</span>
            </div>
          </Link>
          <button 
            type="button" 
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
          <div className="mb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {role?.replace('-', ' ')} Console
          </div>
          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Quick link simulations for System Administrators */}
          {role === 'system-admin' && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="mb-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Preview Portals (SysAdmin Dev)
              </div>
              <div className="space-y-1">
                {adminJumpLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.path}
                    className="block rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    🚀 {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Card at base of Sidebar */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <img 
              src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
              alt={user?.name}
              className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-slate-800">{user?.name}</p>
              <p className="truncate text-[10px] text-slate-400 uppercase font-semibold">{user?.role?.replace('-', ' ')}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page View Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Breadcrumbs Navigation */}
            <nav className="hidden items-center gap-1.5 text-sm text-slate-500 sm:flex">
              <span className="font-semibold text-slate-400">Portal</span>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.url}>
                  <span className="text-slate-300">/</span>
                  <Link 
                    to={crumb.url}
                    className={`font-semibold hover:text-emerald-600 transition-colors ${crumb.isLast ? 'text-slate-800' : 'text-slate-500'}`}
                  >
                    {crumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Dropdown Toggle */}
            <div className="relative">
              <button 
                type="button" 
                className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-100 bg-slate-50"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {activeNotificationCount > 0 && (
                  <span className="absolute top-[2px] right-[2px] flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {activeNotificationCount}
                  </span>
                )}
              </button>

              {/* Notification Overlay Menu */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-40">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                      <span className="text-xs font-bold text-slate-800">Alerts & Notifications</span>
                      <button 
                        onClick={markAllRead}
                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`flex flex-col gap-0.5 rounded-xl px-4 py-3 text-xs transition-colors hover:bg-slate-50 ${!notif.read ? 'bg-emerald-50/30' : ''}`}
                        >
                          <span className={`font-semibold ${!notif.read ? 'text-slate-800' : 'text-slate-600'}`}>{notif.text}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{notif.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar Dropdown */}
            <div className="relative">
              <button 
                type="button" 
                className="flex items-center gap-2 rounded-xl p-1.5 text-left text-sm font-semibold hover:bg-slate-50 transition border border-transparent hover:border-slate-150"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <img 
                  src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
                  alt={user?.name}
                  className="h-8 w-8 rounded-lg object-cover ring-2 ring-emerald-500/10 shadow-sm"
                />
                <span className="hidden select-none text-xs font-semibold text-slate-700 md:inline">{user?.name}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-40">
                    <div className="px-3 py-2 text-xs border-b border-slate-100">
                      <p className="font-bold text-slate-800 text-truncate">{user?.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{user?.email}</p>
                    </div>
                    <Link
                      to={`/${role}/settings`}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4" /> System Settings
                    </Link>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area Scroll Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7-xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
