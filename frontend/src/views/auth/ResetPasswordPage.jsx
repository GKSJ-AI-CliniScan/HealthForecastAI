import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartPulse, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitted(true);
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl border border-slate-200/50 shadow-xl">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <HeartPulse className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-800 font-heading">
            Choose New Password
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-slate-400">
            Set your brand new security credentials.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-xs font-medium text-red-700 border border-red-100">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">Password Updated</h3>
              <p className="text-xs text-slate-400 font-medium">
                Your passphrase has been updated successfully.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="mt-2 block w-full justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Sign In to Your Account
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <KeyRound className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 transition hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <KeyRound className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 transition hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition"
              >
                Reset Password Credentials
              </button>
            </div>
          </form>
        )}

        <div className="flex justify-center mt-6">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
