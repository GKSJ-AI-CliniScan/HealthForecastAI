import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-teal-600 text-white shadow-xl shadow-teal-600/30 mb-4">
          <Activity className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black">Reset Hospital Account Password</h2>
        <p className="mt-2 text-xs text-slate-500">
          Enter your registered clinical email to receive reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="glass-panel p-8 rounded-3xl shadow-2xl space-y-6">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold">Password Reset Link Dispatched</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                If an account exists for <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>, password reset credentials have been delivered.
              </p>
              <Link to="/login" className="inline-block mt-4">
                <Button variant="outline" size="sm" icon={ArrowLeft}>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Clinical Email Address"
                type="email"
                placeholder="doctor@hospital.org"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Send Reset Instructions
              </Button>
              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-semibold text-teal-600 hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
