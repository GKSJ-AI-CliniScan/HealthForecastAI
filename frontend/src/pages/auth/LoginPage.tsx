import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Stethoscope,
  Building2,
  FlaskConical,
  UserCog,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const DEMO_DEFAULT_PASS = 'HealthForecast' + '2026!';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('dr.smith');
  const [password, setPassword] = useState(DEMO_DEFAULT_PASS);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLoggingRole, setQuickLoggingRole] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username_or_email: identifier, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Authentication failed. Please check credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (username: string) => {
    setError(null);
    setIdentifier(username);
    setPassword(DEMO_DEFAULT_PASS);
    setQuickLoggingRole(username);
    try {
      await login({ username_or_email: username, password: DEMO_DEFAULT_PASS });
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message || `Failed to sign in as ${username}. Please verify database seed.`
      );
    } finally {

      setQuickLoggingRole(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/2"></div>

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <Link to="/" className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-xl shadow-teal-600/30 mb-4 hover:scale-105 transition-transform">
          <Activity className="w-8 h-8" />
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          HealthForecast <span className="text-teal-600 dark:text-teal-400">AI</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
          Hospital Readmission Prediction & Patient Risk Intelligence System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="glass-panel p-8 rounded-3xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username or Clinical Email"
              type="text"
              placeholder="e.g. dr.smith or doctor@healthforecast.ai"
              icon={Mail}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              icon={ShieldCheck}
            >
              Sign In to Platform
            </Button>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>New to HealthForecast AI?</span>
              <Link
                to="/register"
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Create an Account
              </Link>
            </div>
          </form>

          {/* Quick Role Fillers with 1-Click Instant Login */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                1-Click Quick Demo Login
              </p>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Click to login directly</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading || !!quickLoggingRole}
                onClick={() => handleQuickDemoLogin('dr.smith')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/60 text-left hover:border-teal-500 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs group"
              >
                {quickLoggingRole === 'dr.smith' ? (
                  <Loader2 className="w-4 h-4 text-teal-600 animate-spin flex-shrink-0" />
                ) : (
                  <Stethoscope className="w-4 h-4 text-teal-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-teal-900 dark:text-teal-300 truncate">Doctor</p>
                  <p className="text-[10px] text-teal-600/80 font-mono">dr.smith</p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading || !!quickLoggingRole}
                onClick={() => handleQuickDemoLogin('hosp.admin')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 text-left hover:border-sky-500 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs group"
              >
                {quickLoggingRole === 'hosp.admin' ? (
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-sky-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-sky-900 dark:text-sky-300 truncate">Hospital Admin</p>
                  <p className="text-[10px] text-sky-600/80 font-mono">hosp.admin</p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading || !!quickLoggingRole}
                onClick={() => handleQuickDemoLogin('res.curie')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 text-left hover:border-purple-500 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs group"
              >
                {quickLoggingRole === 'res.curie' ? (
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin flex-shrink-0" />
                ) : (
                  <FlaskConical className="w-4 h-4 text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-purple-900 dark:text-purple-300 truncate">Researcher</p>
                  <p className="text-[10px] text-purple-600/80 font-mono">res.curie</p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading || !!quickLoggingRole}
                onClick={() => handleQuickDemoLogin('sysadmin')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 text-left hover:border-rose-500 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs group"
              >
                {quickLoggingRole === 'sysadmin' ? (
                  <Loader2 className="w-4 h-4 text-rose-600 animate-spin flex-shrink-0" />
                ) : (
                  <UserCog className="w-4 h-4 text-rose-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-rose-900 dark:text-rose-300 truncate">System Admin</p>
                  <p className="text-[10px] text-rose-600/80 font-mono">sysadmin</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
