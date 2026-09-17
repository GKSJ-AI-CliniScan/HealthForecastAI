import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

import { LandingPage } from '@/pages/landing/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PatientListPage } from '@/pages/patients/PatientListPage';
import { PatientDetailsPage } from '@/pages/patients/PatientDetailsPage';
import { MedicalHistoryPage } from '@/pages/clinical/MedicalHistoryPage';
import { AdmissionsPage } from '@/pages/clinical/AdmissionsPage';
import { TreatmentsPage } from '@/pages/clinical/TreatmentsPage';
import { UserProfilePage } from '@/pages/profile/UserProfilePage';

import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { RoleManagementPage } from '@/pages/admin/RoleManagementPage';
import { DoctorPatientAssignmentPage } from '@/pages/admin/DoctorPatientAssignmentPage';
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';
import { DatasetSummaryPage } from '@/pages/admin/DatasetSummaryPage';

import { PredictionDashboard } from '@/pages/predictions/PredictionDashboard';
import { HighRiskPatients } from '@/pages/predictions/HighRiskPatients';
import { PredictionHistory } from '@/pages/predictions/PredictionHistory';
import { PredictionDetail } from '@/pages/predictions/PredictionDetail';

import { TreatmentEffectiveness } from '@/pages/analytics/TreatmentEffectiveness';
import { RecoveryAnalysis } from '@/pages/analytics/RecoveryAnalysis';
import { MedicationEffectiveness } from '@/pages/analytics/MedicationEffectiveness';
import { HospitalPerformance } from '@/pages/analytics/HospitalPerformance';
import { DepartmentPerformance } from '@/pages/analytics/DepartmentPerformance';
import { HealthcareTrends } from '@/pages/analytics/HealthcareTrends';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* 2. Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />


      {/* 3. Locked Clinical & Operational Platform Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientListPage />} />
          <Route path="/patients/:id" element={<PatientDetailsPage />} />
          <Route path="/medical-records" element={<MedicalHistoryPage />} />
          <Route path="/admissions" element={<AdmissionsPage />} />
          <Route path="/treatments" element={<TreatmentsPage />} />
          <Route path="/profile" element={<UserProfilePage />} />

          {/* AI Risk Intelligence Routes (Milestone 2) */}
          <Route path="/predictions/dashboard" element={<PredictionDashboard />} />
          <Route path="/predictions/high-risk" element={<HighRiskPatients />} />
          <Route path="/predictions/history" element={<PredictionHistory />} />
          <Route path="/predictions/:id" element={<PredictionDetail />} />

          {/* Clinical & Healthcare Analytics Routes (Milestone 3) */}
          <Route path="/analytics/treatments" element={<TreatmentEffectiveness />} />
          <Route path="/analytics/recovery" element={<RecoveryAnalysis />} />
          <Route path="/analytics/medications" element={<MedicationEffectiveness />} />
          <Route element={<RoleBasedRoute allowedRoles={['HOSPITAL_ADMIN', 'RESEARCHER', 'SYSTEM_ADMIN']} />}>
            <Route path="/analytics/hospital-performance" element={<HospitalPerformance />} />
            <Route path="/analytics/departments" element={<DepartmentPerformance />} />
            <Route path="/analytics/trends" element={<HealthcareTrends />} />
          </Route>

          {/* Locked System Administrator Routes */}
          <Route element={<RoleBasedRoute allowedRoles={['SYSTEM_ADMIN']} />}>
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/roles" element={<RoleManagementPage />} />
            <Route path="/admin/assignments" element={<DoctorPatientAssignmentPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Locked Dataset Pipeline Routes */}
          <Route element={<RoleBasedRoute allowedRoles={['SYSTEM_ADMIN', 'RESEARCHER', 'HOSPITAL_ADMIN']} />}>
            <Route path="/admin/dataset" element={<DatasetSummaryPage />} />
          </Route>
        </Route>
      </Route>

      {/* 4. Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
