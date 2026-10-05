import React from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

export const metadata: Metadata = {
  title: 'Register Practitioner Account | HealthForecast AI',
  description: 'Create an authorized practitioner or administrator account on HealthForecast AI.',
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create Practitioner Account"
      subtitle="Provide your professional credentials to establish role-based access."
      badgeText="Role Onboarding"
      heroHeadline="Join the Clinical Intelligence Platform"
      heroDescription="Accounts are provisioned based on hospital credentials, department assignment, and role-based access governance."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
