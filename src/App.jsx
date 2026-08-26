import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import NotFoundPage from './pages/auth/NotFoundPage';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientsPage from './pages/doctor/PatientsPage';
import PatientDetailsPage from './pages/doctor/PatientDetailsPage';
import RiskPredictionsPage from './pages/doctor/RiskPredictionsPage';
import ReadmissionForecastingPage from './pages/doctor/ReadmissionForecastingPage';
import TreatmentEffectivenessPage from './pages/doctor/TreatmentEffectivenessPage';
import ClinicalInsightsPage from './pages/doctor/ClinicalInsightsPage';

// Hospital Admin Pages
import HospitalAdminDashboard from './pages/hospital-admin/HospitalAdminDashboard';
import OutcomeAnalyticsPage from './pages/hospital-admin/OutcomeAnalyticsPage';
import DepartmentPerformancePage from './pages/hospital-admin/DepartmentPerformancePage';
import HospitalReportsPage from './pages/hospital-admin/HospitalReportsPage';

// Researcher Pages
import ResearcherDashboard from './pages/researcher/ResearcherDashboard';
import PopulationHealthPage from './pages/researcher/PopulationHealthPage';
import ReadmissionTrendsPage from './pages/researcher/ReadmissionTrendsPage';
import ResearchDatasetsPage from './pages/researcher/ResearchDatasetsPage';

// System Admin Pages
import SystemAdminDashboard from './pages/system-admin/SystemAdminDashboard';
import UserManagementPage from './pages/system-admin/UserManagementPage';
import RoleManagementPage from './pages/system-admin/RoleManagementPage';
import DatasetManagementPage from './pages/system-admin/DatasetManagementPage';
import AiModelManagementPage from './pages/system-admin/AiModelManagementPage';
import AuditLogsPage from './pages/system-admin/AuditLogsPage';
import SystemSettingsPage from './pages/system-admin/SystemSettingsPage';

// Root level redirect handler
const RootRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-55">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  switch (user.role) {
    case 'doctor':
      return <Navigate to="/doctor/dashboard" replace />;
    case 'hospital-admin':
      return <Navigate to="/hospital-admin/dashboard" replace />;
    case 'researcher':
      return <Navigate to="/researcher/dashboard" replace />;
    case 'system-admin':
      return <Navigate to="/system-admin/dashboard" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Root Redirect handler */}
          <Route path="/" element={<RootRedirect />} />

          {/* DRIVER ROLE: Doctors & Admins */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'system-admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:id" element={<PatientDetailsPage />} />
            <Route path="risk-predictions" element={<RiskPredictionsPage />} />
            <Route path="readmission" element={<ReadmissionForecastingPage />} />
            <Route path="treatment-effectiveness" element={<TreatmentEffectivenessPage />} />
            <Route path="clinical-insights" element={<ClinicalInsightsPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
          </Route>

          {/* DRIVER ROLE: Hospital Admins & System Admins */}
          <Route
            path="/hospital-admin"
            element={
              <ProtectedRoute allowedRoles={['hospital-admin', 'system-admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<HospitalAdminDashboard />} />
            <Route path="analytics" element={<OutcomeAnalyticsPage />} />
            <Route path="performance" element={<DepartmentPerformancePage />} />
            <Route path="reports" element={<HospitalReportsPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
          </Route>

          {/* DRIVER ROLE: Researchers & System Admins */}
          <Route
            path="/researcher"
            element={
              <ProtectedRoute allowedRoles={['researcher', 'system-admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ResearcherDashboard />} />
            <Route path="population-health" element={<PopulationHealthPage />} />
            <Route path="readmission-trends" element={<ReadmissionTrendsPage />} />
            <Route path="datasets" element={<ResearchDatasetsPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
          </Route>

          {/* DRIVER ROLE: System Admins Only */}
          <Route
            path="/system-admin"
            element={
              <ProtectedRoute allowedRoles={['system-admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<SystemAdminDashboard />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="roles" element={<RoleManagementPage />} />
            <Route path="datasets" element={<DatasetManagementPage />} />
            <Route path="models" element={<AiModelManagementPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
          </Route>

          {/* Catch-all 404 handler */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
