import React from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

export const metadata: Metadata = {
  title: 'Sign In | HealthForecast AI',
  description: 'Sign in to access AI-assisted readmission prediction and patient risk intelligence.',
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Practitioner Sign In"
      subtitle="Enter your verified credentials to access role-authorized clinical data."
      badgeText="Clinical Sign-In"
      heroHeadline="Hospital Readmission Prediction & Patient Risk Intelligence"
      heroDescription="Access predictive patient risk stratification, readmission risk tracking, and real-time clinical dashboards tailored to your role."
    >
      <LoginForm />
    </AuthLayout>
  );
}
