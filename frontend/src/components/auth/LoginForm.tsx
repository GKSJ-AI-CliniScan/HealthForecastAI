'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, PulseIcon } from '@/components/ui/Icons';
import { Role } from '@/types';

const DEMO_ACCOUNTS: { role: Role; label: string; email: string; desc: string }[] = [
  {
    role: 'doctor',
    label: 'Doctor',
    email: 'dr.sarah@hospital.org',
    desc: 'Clinical risk prediction & patient care',
  },
  {
    role: 'hospital_admin',
    label: 'Hospital Admin',
    email: 'admin.director@hospital.org',
    desc: 'Bed capacity & readmission rates',
  },
  {
    role: 'researcher',
    label: 'Researcher',
    email: 'researcher.chen@health.edu',
    desc: 'Cohort analysis & treatment outcomes',
  },
  {
    role: 'system_admin',
    label: 'System Admin',
    email: 'sysadmin@healthforecast.ai',
    desc: 'User management & ML model deployment',
  },
];

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    // Simulate frontend validation & authentication response
    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(`Signed in successfully as ${email}. (Frontend demo mode)`);
    }, 800);
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('HealthcareDemo2026!');
    setErrors({});
    setLoginSuccess(null);
  };

  return (
    <div className="w-full space-y-6">
      {loginSuccess && (
        <Alert variant="success" title="Authentication Successful">
          {loginSuccess}
          <div className="mt-2">
            <Link
              href="/"
              className="inline-flex items-center text-xs font-semibold text-emerald-800 dark:text-emerald-300 underline hover:no-underline"
            >
              Continue to Dashboard &rarr;
            </Link>
          </div>
        </Alert>
      )}

      {errors.form && (
        <Alert variant="danger" title="Authentication Error">
          {errors.form}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Field */}
        <Input
          id="login-email"
          name="email"
          type="email"
          label="Work / Hospital Email"
          placeholder="name@hospital.org"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          leadingIcon={<MailIcon className="h-4 w-4" />}
        />

        {/* Password Field */}
        <div className="space-y-1.5">
          <Input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            leadingIcon={<LockIcon className="h-4 w-4" />}
            trailingIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none"
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            }
          />
        </div>

        {/* Remember me & Forgot password */}
        <div className="flex items-center justify-between pt-1">
          <Checkbox
            id="remember-me"
            name="remember-me"
            label="Remember me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />

          <Link
            href="#forgot-password"
            onClick={(e) => {
              e.preventDefault();
              alert('Password reset workflow will be connected with backend auth.');
            }}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 focus-visible:outline-none focus-visible:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          rightIcon={<ArrowRightIcon className="h-4 w-4" />}
          className="mt-2"
        >
          Sign In to HealthForecast AI
        </Button>
      </form>

      {/* Reviewer Quick-Fill Presets */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 mb-2.5">
          <PulseIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Reviewer Demo Quick-Fill:
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => handleQuickFill(acc.email)}
              className="flex flex-col items-start rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-brand-500 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-400 text-xs transition-colors"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {acc.label}
              </span>
              <span className="text-[10px] text-slate-500 truncate w-full">
                {acc.email}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Switch to Register */}
      <div className="text-center text-xs text-slate-600 dark:text-slate-400">
        Don&apos;t have an authorized account?{' '}
        <Link
          href="/register"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 focus-visible:outline-none focus-visible:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
