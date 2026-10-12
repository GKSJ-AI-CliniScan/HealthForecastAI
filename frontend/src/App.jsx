import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Public Global Home Page
import HomePage from './views/HomePage';

// Auth Pages
import LoginPage from './views/auth/LoginPage';
import ForgotPasswordPage from './views/auth/ForgotPasswordPage';
import ResetPasswordPage from './views/auth/ResetPasswordPage';
import UnauthorizedPage from './views/auth/UnauthorizedPage';
import NotFoundPage from './views/auth/NotFoundPage';

// Doctor Pages
import DoctorDashboard from './views/doctor/DoctorDashboard';
import PatientsPage from './views/doctor/PatientsPage';
import PatientDetailsPage from './views/doctor/PatientDetailsPage';
import RiskPredictionsPage from './views/doctor/RiskPredictionsPage';
import ReadmissionForecastingPage from './views/doctor/ReadmissionForecastingPage';
import TreatmentEffectivenessPage from './views/doctor/TreatmentEffectivenessPage';
import ClinicalInsightsPage from './views/doctor/ClinicalInsightsPage';

// Hospital Admin Pages
import HospitalAdminDashboard from './views/hospital-admin/HospitalAdminDashboard';
import OutcomeAnalyticsPage from './views/hospital-admin/OutcomeAnalyticsPage';
import DepartmentPerformancePage from './views/hospital-admin/DepartmentPerformancePage';
import HospitalReportsPage from './views/hospital-admin/HospitalReportsPage';

// Researcher Pages
import ResearcherDashboard from './views/researcher/ResearcherDashboard';
import PopulationHealthPage from './views/researcher/PopulationHealthPage';
import ReadmissionTrendsPage from './views/researcher/ReadmissionTrendsPage';
import ResearchDatasetsPage from './views/researcher/ResearchDatasetsPage';

// System Admin Pages
import SystemAdminDashboard from './views/system-admin/SystemAdminDashboard';
import UserManagementPage from './views/system-admin/UserManagementPage';
import RoleManagementPage from './views/system-admin/RoleManagementPage';
import DatasetManagementPage from './views/system-admin/DatasetManagementPage';
import AiModelManagementPage from './views/system-admin/AiModelManagementPage';
import AuditLogsPage from './views/system-admin/AuditLogsPage';
import SystemSettingsPage from './views/system-admin/SystemSettingsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Landing Home Page (No login required) */}
          <Route path="/" element={<HomePage />} />

          {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

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
