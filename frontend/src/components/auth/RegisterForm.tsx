'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import {
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import { Role } from '@/types';

interface RegisterFormState {
  fullName: string;
  email: string;
  role: Role | '';
  password: string;
  confirmPassword: string;
  department: string;
  agreeCompliance: boolean;
}

const ROLE_OPTIONS = [
  { value: 'doctor', label: 'Doctor (Clinical Risk Prediction & Patient Care)' },
  { value: 'hospital_admin', label: 'Hospital Administrator (Operations & Resource Management)' },
  { value: 'researcher', label: 'Healthcare Researcher (Outcome Analytics & Cohort Studies)' },
  { value: 'system_admin', label: 'System Administrator (User Access & ML Configuration)' },
];

export function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormState>({
    fullName: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
    department: '',
    agreeCompliance: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormState | 'form', string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormState, string>> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Work email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid work email address';
      }
    }

    if (!formData.role) {
      newErrors.role = 'Please select your professional role';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must include uppercase, lowercase, and a number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeCompliance) {
      newErrors.agreeCompliance = 'You must agree to healthcare data compliance terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterSuccess(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    // Simulate frontend registration
    setTimeout(() => {
      setIsLoading(false);
      setRegisterSuccess(
        `Account registration initiated for ${formData.fullName} as ${formData.role}. Please proceed to Sign In.`,
      );
    }, 900);
  };

  const handleChange = (field: keyof RegisterFormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full space-y-5">
      {registerSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 mb-3">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
            Account Registration Submitted
          </h3>
          <p className="mt-1.5 text-xs text-emerald-800 dark:text-emerald-300/90 max-w-md mx-auto">
            {registerSuccess}
          </p>
          <div className="mt-5">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm"
            >
              Go to Sign In &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.form && (
            <Alert variant="danger" title="Registration Error">
              {errors.form}
            </Alert>
          )}

          {/* Full Name & Work Email in 2 Cols on md screens */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="register-fullname"
              name="fullName"
              type="text"
              label="Full Name"
              placeholder="e.g. Dr. Robert Vance"
              required
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              error={errors.fullName}
              leadingIcon={<UserIcon className="h-4 w-4" />}
            />

            <Input
              id="register-email"
              name="email"
              type="email"
              label="Work / Hospital Email"
              placeholder="robert.vance@hospital.org"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              leadingIcon={<MailIcon className="h-4 w-4" />}
            />
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="register-role"
              name="role"
              label="Assigned Role"
              required
              placeholderOption="Select professional role"
              options={ROLE_OPTIONS}
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value as Role)}
              error={errors.role}
              hint="Determines module access & clinical intelligence tools"
            />

            <Input
              id="register-department"
              name="department"
              type="text"
              label="Department / Unit (Optional)"
              placeholder="e.g. Internal Medicine / ICU"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              hint="Clinical division or administrative sector"
            />
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Min 8 characters (A-z, 0-9)"
              required
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              leadingIcon={<LockIcon className="h-4 w-4" />}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none"
                >
                  {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              }
            />

            <Input
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              placeholder="Re-enter password"
              required
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              leadingIcon={<LockIcon className="h-4 w-4" />}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              }
            />
          </div>

          {/* Healthcare Compliance Agreement */}
          <div className="pt-2">
            <Checkbox
              id="register-compliance"
              name="agreeCompliance"
              checked={formData.agreeCompliance}
              onChange={(e) => handleChange('agreeCompliance', e.target.checked)}
              error={errors.agreeCompliance}
              label={
                <span className="text-xs">
                  I acknowledge adherence to HIPAA & healthcare data governance protocols for patient
                  confidentiality and clinical risk assessment.
                </span>
              }
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRightIcon className="h-4 w-4" />}
            className="mt-4"
          >
            Create Healthcare Account
          </Button>
        </form>
      )}

      {/* Switch to Login */}
      <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        Already have an authorized healthcare account?{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 focus-visible:outline-none focus-visible:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
