import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HeartPulse, KeyRound, Mail, AlertCircle, Activity, Brain, ShieldAlert } from 'lucide-react';

const LoginPage = () => {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Selected Login Portal Mode State
  const [selectedRole, setSelectedRole] = useState('doctor');

  const [email, setEmail] = useState('doctor@healthforecast.ai');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default redirect path or target from router history
  const from = location.state?.from?.pathname || `/`;

  // Portal Themes Configs
  const roleConfigs = {
    doctor: {
      name: "🩺 Doctor/Clinician Workspace",
      description: "Clinical risk levels & readmission diagnostics decision support.",
      primaryColor: "emerald",
      accentBg: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
      accentText: "text-emerald-700",
      focusBorder: "focus:border-emerald-500",
      label: "Doctor View",
      email: "doctor@healthforecast.ai"
    },
    'hospital-admin': {
      name: "🏦 Hospital Administration Node",
      description: "Outcome performance statistics, department metrics, and billing reports.",
      primaryColor: "indigo",
      accentBg: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
      accentText: "text-indigo-700",
      focusBorder: "focus:border-indigo-500",
      label: "Hospital Admin",
      email: "admin@healthforecast.ai"
    },
    researcher: {
      name: "🧪 Researcher Analytics Workspace",
      description: "Anonymized cohort ages, stay duration metrics, and dataset exports.",
      primaryColor: "violet",
      accentBg: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500",
      accentText: "text-purple-700",
      focusBorder: "focus:border-purple-500",
      label: "Researcher",
      email: "researcher@healthforecast.ai"
    },
    'system-admin': {
      name: "💻 Systems Administration Console",
      description: "PostgreSQL links, backup schedules, server telemetries, and model training.",
      primaryColor: "blue",
      accentBg: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
      accentText: "text-blue-700",
      focusBorder: "focus:border-blue-500",
      label: "System Admin",
      email: "sysadmin@healthforecast.ai"
    }
  };

  const currentTheme = roleConfigs[selectedRole];

  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    // Read from persistent hf_users local storage to reflect any updated name / profile photo
    const stored = localStorage.getItem('hf_users');
    if (stored) {
      try {
        setUsersList(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load customized user database', e);
      }
    }
  }, []);

  const getRoleUser = (roleName) => {
    const emailMap = {
      doctor: 'doctor@healthforecast.ai',
      'hospital-admin': 'admin@healthforecast.ai',
      researcher: 'researcher@healthforecast.ai',
      'system-admin': 'sysadmin@healthforecast.ai'
    };
    const targetEmail = emailMap[roleName];
    return usersList.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
  };

  const roleUser = getRoleUser(selectedRole);
  const displayName = roleUser?.name || currentTheme.name;
  const displayAvatar = roleUser?.avatar;

  useEffect(() => {
    // If already logged in, redirect home/intended page immediately
    if (isAuthenticated && role) {
      navigate(`/${role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all standard credentials.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const u = await login(email, password);
      // Success redirect
      navigate(`/${u.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Verify username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (roleName) => {
    setSelectedRole(roleName);
    setEmail(roleConfigs[roleName].email);
    if (roleName === 'system-admin') {
      setPassword('');
    } else {
      setPassword('password123');
    }
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      <div className="w-full max-w-lg space-y-6 bg-white p-8 rounded-3xl border border-slate-205/60 shadow-xl">
        
        {/* Banner Logo & Dynamic Role Description */}
        <div className="flex flex-col items-center justify-center text-center animate-fade-in">
          {displayAvatar ? (
            <img 
              src={displayAvatar} 
              alt={displayName} 
              className="h-14 w-14 rounded-2xl object-cover shadow-md border-2 border-slate-100 transition-all duration-500 hover:scale-105" 
            />
          ) : (
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md transition-all duration-500 ${
              selectedRole === 'doctor' ? 'bg-emerald-600' :
              selectedRole === 'hospital-admin' ? 'bg-indigo-600' :
              selectedRole === 'researcher' ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              <HeartPulse className="h-7 w-7 animate-pulse" />
            </span>
          )}
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-808 font-heading">
            {displayName}
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-slate-400 max-w-sm leading-relaxed">
            {currentTheme.description}
          </p>
        </div>

        {/* Dynamic Role Tab Buttons Selector */}
        <div className="space-y-1.5">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Select Portal Role</span>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
            {Object.keys(roleConfigs).map((r) => {
              const theme = roleConfigs[r];
              const isSelected = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleSelect(r)}
                  className={`py-2 px-1 text-[10px] font-extrabold uppercase rounded-xl transition cursor-pointer text-center truncate ${
                    isSelected 
                      ? `${selectedRole === 'doctor' ? 'bg-emerald-600 text-white' : selectedRole === 'hospital-admin' ? 'bg-indigo-600 text-white' : selectedRole === 'researcher' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'} shadow-sm` 
                      : 'text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}
                >
                  {theme.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex gap-2.5 rounded-xl bg-red-50 p-4 text-xs font-medium text-red-700 border border-red-100">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-3.5">
            <div>
              <label htmlFor="email-address" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full rounded-xl border border-slate-200 bg-slate-55 py-3 pl-11 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 transition hover:border-slate-350 focus:bg-white focus:outline-hidden ${currentTheme.focusBorder}`}
                  placeholder="name@healthforecast.ai"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Secure Password
                </label>
                <Link 
                  to="/forgot-password" 
                  className={`text-[10px] font-bold transition hover:underline ${currentTheme.accentText}`}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <KeyRound className="h-4.5 w-4.5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full rounded-xl border border-slate-200 bg-slate-55 py-3 pl-11 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 transition hover:border-slate-350 focus:bg-white focus:outline-hidden ${currentTheme.focusBorder}`}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`relative flex w-full justify-center rounded-xl px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md transition duration-150 focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-60 cursor-pointer ${currentTheme.accentBg}`}
            >
              {loading ? (
                <>
                  <span className="absolute left-4 top-1/2 -mt-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Authenticating Session...
                </>
              ) : (
                `Enter ${currentTheme.label} Portal`
              )}
            </button>
            <div className="mt-4 flex justify-center">
              <Link
                to="/signup"
                className={`relative flex w-full max-w-xs justify-center rounded-xl px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md transition duration-150 focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${currentTheme.accentBg}`}
              >
                Create New Account
              </Link>
            </div>
          </div>
        </form>

        {/* Demo Guide Footer */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            Selected credentials auto-populate for validation testing (System Admin requires manual entry).
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
