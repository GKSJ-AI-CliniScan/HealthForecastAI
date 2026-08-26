import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HeartPulse, KeyRound, Mail, AlertCircle, ArrowLeft,
  Lock, ArrowRight, ShieldCheck, Stethoscope, Building2, Microscope, Sparkles
} from 'lucide-react';

const LoginPage = () => {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState('doctor');
  const [email, setEmail] = useState('doctor@healthforecast.ai');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleConfigs = {
    doctor: {
      name: "Doctor & Clinician Portal",
      description: "Patient risk stratification, acute vitals, and decision support worksheets.",
      icon: Stethoscope, label: "Doctor", email: "doctor@healthforecast.ai"
    },
    'hospital-admin': {
      name: "Hospital Administration Node",
      description: "Outcome performance statistics, department metrics, bed occupancy, and reports.",
      icon: Building2, label: "Hospital Admin", email: "admin@healthforecast.ai"
    },
    researcher: {
      name: "Healthcare Researcher Lab",
      description: "Anonymized cohort ages, stay duration metrics, and dataset exports.",
      icon: Microscope, label: "Researcher", email: "researcher@healthforecast.ai"
    },
    'system-admin': {
      name: "System Administration Console",
      description: "Staff RBAC permissions, audit trail stream, and system configurations.",
      icon: ShieldCheck, label: "System Admin", email: "sysadmin@healthforecast.ai"
    }
  };

  const currentTheme = roleConfigs[selectedRole];
  const CurrentIcon = currentTheme.icon;

  const [usersList, setUsersList] = useState([]);
  useEffect(() => {
    const stored = localStorage.getItem('hf_users');
    if (stored) { try { setUsersList(JSON.parse(stored)); } catch (e) {} }
  }, []);

  const getRoleUser = (roleName) => {
    const emailMap = { doctor: 'doctor@healthforecast.ai', 'hospital-admin': 'admin@healthforecast.ai', researcher: 'researcher@healthforecast.ai', 'system-admin': 'sysadmin@healthforecast.ai' };
    return usersList.find(u => u.email.toLowerCase() === emailMap[roleName].toLowerCase());
  };

  const roleUser = getRoleUser(selectedRole);
  const displayName = roleUser?.name || currentTheme.name;
  const displayAvatar = roleUser?.avatar;

  useEffect(() => {
    if (isAuthenticated && role) navigate(`/${role}/dashboard`, { replace: true });
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in email and password credentials.'); return; }
    setLoading(true); setError('');
    try {
      const u = await login(email, password);
      navigate(`/${u.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally { setLoading(false); }
  };

  const handleRoleSelect = (roleName) => {
    setSelectedRole(roleName);
    setEmail(roleConfigs[roleName].email);
    setPassword(roleName === 'system-admin' ? '' : 'password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans flex flex-col selection:bg-red-600 selection:text-white relative overflow-x-hidden">

      {/* Subtle red ambient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 opacity-20 pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse, #fca5a5 0%, transparent 70%)' }} />

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 text-white shadow-md shadow-red-200 group-hover:scale-105 transition-transform duration-300">
              <HeartPulse className="h-6 w-6 animate-pulse text-white" />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-zinc-900 leading-none tracking-tight text-lg">
                St. Jude <span className="text-red-600">Medical Center</span>
              </span>
              <span className="text-[9px] font-bold text-zinc-400 tracking-wider uppercase mt-0.5">Hospital & Patient Care System</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-zinc-500">
            <Link to="/" className="hover:text-red-600 transition-colors">Hospital Home</Link>
            <Link to="/#about" className="hover:text-red-600 transition-colors">About Us</Link>
            <Link to="/#departments" className="hover:text-red-600 transition-colors">Departments</Link>
            <Link to="/#contact" className="hover:text-red-600 transition-colors">Emergency & Contact</Link>
          </nav>

          <Link to="/" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-600 border border-zinc-200 shadow-sm hover:bg-zinc-50 hover:border-red-200 transition-all hover:scale-105">
            <ArrowLeft className="h-3.5 w-3.5 text-red-500" /> Hospital Home
          </Link>
        </div>
      </header>

      {/* ── Login Card ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl relative hover:border-red-200 transition-all duration-300">

          {/* Header */}
          <div className="flex flex-col items-center justify-center text-center">
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="h-16 w-16 rounded-2xl object-cover shadow-md border-2 border-zinc-200 ring-2 ring-red-500/20" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-700 text-white shadow-lg shadow-red-200 animate-pulse-glow">
                <CurrentIcon className="h-7 w-7 text-white" />
              </span>
            )}
            <h2 className="mt-3.5 text-xl font-extrabold tracking-tight text-zinc-900">{displayName}</h2>
            <p className="mt-1 text-xs font-semibold text-zinc-400 max-w-xs leading-relaxed">{currentTheme.description}</p>
          </div>

          {/* Role tabs */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest text-center">Select Staff Role</span>
            <div className="grid grid-cols-4 gap-1.5 bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200">
              {Object.keys(roleConfigs).map((r) => {
                const isSelected = selectedRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSelect(r)}
                    className={`py-2 px-1 text-[10px] font-extrabold uppercase rounded-xl transition cursor-pointer text-center truncate ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-200'
                        : 'text-zinc-500 hover:bg-white hover:text-zinc-700'
                    }`}
                  >
                    {roleConfigs[r].label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-600 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div>
                <label htmlFor="email-address" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Staff Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400"><Mail className="h-4 w-4" /></span>
                  <input
                    id="email-address" name="email" type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-800 placeholder-zinc-400 transition hover:border-zinc-300 focus:bg-white focus:outline-hidden focus:border-red-500"
                    placeholder="name@healthforecast.ai"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password</label>
                  <Link to="/forgot-password" className="text-[10px] font-bold text-red-600 hover:text-red-700 transition hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400"><KeyRound className="h-4 w-4" /></span>
                  <input
                    id="password" name="password" type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-800 placeholder-zinc-400 transition hover:border-zinc-300 focus:bg-white focus:outline-hidden focus:border-red-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-red-200 transition duration-150 focus:outline-hidden disabled:opacity-60 cursor-pointer hover:scale-102 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800"
            >
              {loading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>Authenticating Session...</span></>
              ) : (
                <><span>Enter {currentTheme.label} Workspace</span><ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* Helper */}
          <div className="text-center pt-3 border-t border-zinc-100">
            <p className="text-[10px] text-zinc-400 font-medium">
              Demo passwords auto-populate for rapid evaluation (SysAdmin password: <span className="font-bold text-red-600">prasad1234</span>).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-4 text-center text-xs text-zinc-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 St. Jude Medical Center. All rights reserved.</span>
          <Link to="/" className="text-red-600 font-bold hover:underline">Return to St. Jude Hospital Home</Link>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
