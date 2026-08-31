import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Dynamic header title from path
  const getPageTitle = (pathname: string): string => {
    if (pathname.startsWith('/dashboard')) return 'Clinical Dashboard';
    if (pathname.startsWith('/patients/new')) return 'Register Patient';
    if (pathname.startsWith('/patients')) return 'Patient Directory';
    if (pathname.startsWith('/medical-records')) return 'Medical Histories';
    if (pathname.startsWith('/admissions')) return 'Hospital Admissions';
    if (pathname.startsWith('/treatments')) return 'Treatment Management';
    if (pathname.startsWith('/admin/users')) return 'User Administration';
    if (pathname.startsWith('/admin/roles')) return 'System Roles';
    if (pathname.startsWith('/admin/assignments')) return 'Doctor-Patient Assignments';
    if (pathname.startsWith('/admin/audit-logs')) return 'Security Audit Trail';
    if (pathname.startsWith('/admin/dataset')) return 'Dataset Pipeline Foundation';
    if (pathname.startsWith('/profile')) return 'User Profile';
    return 'HealthForecast AI';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <TopNavbar
          title={getPageTitle(location.pathname)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
