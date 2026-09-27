import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { 
  Database, Link as LinkIcon, Save, Check, User, Shield, Image, 
  Upload, Bell, Lock, Key, Sparkles, Building, Stethoscope, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SystemSettingsPage = () => {
  const { user, updateProfile } = useAuth();
  
  // Tab control
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Settings state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [specialtyOrDept, setSpecialtyOrDept] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Notifications & Preferences State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [telemetryStream, setTelemetryStream] = useState(true);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  // Sync state with logged-in user details
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfileAvatar(user.avatar || '');
      setSpecialtyOrDept(user.specialty || user.department || user.institution || user.clearance || '');
    }
  }, [user]);

  // Predefined avatar template suggestions
  const avatarList = [
    { label: "Doctor Saumya", src: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150" },
    { label: "Admin Sah", src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150" },
    { label: "Researcher Raja", src: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150" },
    { label: "SysAdmin Prasad", src: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=150" },
    { label: "Generic Clinical", src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150" }
  ];

  // Handle local file upload (converts image to base64 data URL)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("Image file size must be less than 3MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Core System attributes state (For System Admin)
  const [dbURL, setDbURL] = useState('postgresql://stjude_admin:super-secret@hospital-postgres.internal:5432/readmissions');
  const [modelEndpoint, setModelEndpoint] = useState('http://localhost:8001/predict');
  const [backupSchedule, setBackupSchedule] = useState('Daily');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      const updates = {
        name: profileName,
        email: profileEmail,
        avatar: profileAvatar
      };
      if (user?.role === 'doctor') updates.specialty = specialtyOrDept;
      else if (user?.role === 'hospital-admin') updates.department = specialtyOrDept;
      else if (user?.role === 'researcher') updates.institution = specialtyOrDept;
      else if (user?.role === 'system-admin') updates.clearance = specialtyOrDept;

      await updateProfile(updates);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      alert("Error updating profile credentials: " + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);
    if (!newPassword || newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassSaving(true);
    setTimeout(async () => {
      try {
        await updateProfile({ password: newPassword });
        setPassSaving(false);
        setPassSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPassSuccess(false), 3000);
      } catch (err) {
        setPassError('Failed to change password.');
        setPassSaving(false);
      }
    }, 600);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    setTimeout(() => {
      setSavingSettings(false);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    }, 800);
  };

  const isSysAdmin = user?.role === 'system-admin';

  const getRoleTitle = () => {
    if (user?.role === 'doctor') return 'Doctor / Clinician Profile Settings';
    if (user?.role === 'hospital-admin') return 'Hospital Administrator Settings';
    if (user?.role === 'researcher') return 'Healthcare Researcher Settings';
    return 'System Administrator Workspace & Telemetry';
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={getRoleTitle()}
        description="Update your personal profile credentials, avatar photo, notifications, and portal preferences."
      />

      {/* Tabs Controller */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'profile' 
              ? 'border-red-600 text-red-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          👤 User Profile & Photo
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'preferences' 
              ? 'border-red-600 text-red-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🔔 Notifications & Security
        </button>

        {isSysAdmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'system' 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            ⚙️ Core Telemetry
          </button>
        )}
      </div>

      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* TAB 1: PROFILE & PHOTO EDITING */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSave} className="space-y-6 text-xs">
            {/* Live profile card preview */}
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white shadow-md">
              <img 
                src={profileAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
                alt="Avatar Preview" 
                className="h-16 w-16 rounded-2xl object-cover ring-4 ring-red-500/40 border border-white/20 shadow-md"
              />
              <div className="space-y-0.5">
                <p className="font-bold text-white text-base font-heading">{profileName || 'Your Display Name'}</p>
                <p className="text-[11px] text-red-400 font-extrabold uppercase tracking-wider">{user?.role?.replace('-', ' ')}</p>
                <p className="text-[11px] text-slate-300 font-medium">{profileEmail || user?.email}</p>
                {specialtyOrDept && (
                  <p className="text-[10px] text-slate-400 font-semibold">{specialtyOrDept}</p>
                )}
              </div>
            </div>

            {/* Editable Full Name */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-red-600" /> Full Display Name
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none shadow-sm"
                placeholder="e.g. S.Saumya"
              />
            </div>

            {/* Editable Email */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-red-600" /> Work Email Address
              </label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none shadow-sm"
                placeholder="doctor@healthforecast.ai"
              />
            </div>

            {/* Specialty / Department input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-red-600" /> 
                {user?.role === 'doctor' ? 'Clinical Specialty' :
                 user?.role === 'hospital-admin' ? 'Hospital Department' :
                 user?.role === 'researcher' ? 'Research Institution' : 'Clearance Level'}
              </label>
              <input
                type="text"
                value={specialtyOrDept}
                onChange={(e) => setSpecialtyOrDept(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none shadow-sm"
                placeholder="e.g. Cardiology & Endocrinology"
              />
            </div>

            {/* Custom Image Upload & URL input */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* File upload */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-red-600" /> Upload Local Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-medium">Supports PNG, JPG, WEBP (Max 3MB)</span>
              </div>

              {/* Avatar Image URL */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5 text-red-600" /> Or Avatar Image Web URL
                </label>
                <input
                  type="text"
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none shadow-sm"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </div>

            {/* Avatar suggestions */}
            <div className="space-y-2">
              <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">Or Select Predefined Avatar Template</span>
              <div className="flex flex-wrap gap-3">
                {avatarList.map((avatar) => (
                  <button
                    key={avatar.label}
                    type="button"
                    onClick={() => setProfileAvatar(avatar.src)}
                    className={`relative rounded-xl overflow-hidden h-12 w-12 border-2 transition ${
                      profileAvatar === avatar.src ? 'border-red-600 ring-2 ring-red-500/20 scale-105' : 'border-slate-200 hover:border-slate-400'
                    }`}
                    title={avatar.label}
                  >
                    <img src={avatar.src} alt={avatar.label} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-4">
              <div>
                {profileSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" /> Profile & photo updated successfully!
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" /> {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: NOTIFICATIONS & SECURITY */}
        {activeTab === 'preferences' && (
          <div className="space-y-8">
            {/* Notification preferences */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-850 font-heading border-b border-slate-100 pb-2 flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-600" /> Clinical Notifications & Alerts
              </h3>

              <div className="space-y-3 text-xs font-medium">
                <label className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-800">High-Risk Patient Readmission Alerts</div>
                    <div className="text-slate-400">Receive instant alerts when patient risk score exceeds 75%</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="h-4 w-4 accent-red-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-800">Live Telemetry EHR Event Stream</div>
                    <div className="text-slate-400">Show real-time telemetry events in header toolbar</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={telemetryStream}
                    onChange={(e) => setTelemetryStream(e.target.checked)}
                    className="h-4 w-4 accent-red-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handlePasswordSave} className="space-y-4 border-t border-slate-100 pt-6 text-xs">
              <h3 className="text-sm font-bold text-slate-850 font-heading border-b border-slate-100 pb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-600" /> Change Security Password
              </h3>

              {passError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 font-bold">
                  {passError}
                </div>
              )}

              {passSuccess && (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Password changed successfully!
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none"
                    placeholder="Re-type new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              >
                <Key className="h-4 w-4" /> {passSaving ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: CORE SYSTEM TELEMETRY (System Admin Only) */}
        {activeTab === 'system' && isSysAdmin && (
          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-red-600" /> PostgreSQL Instance URI String
              </label>
              <input
                type="text"
                value={dbURL}
                onChange={(e) => setDbURL(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-red-600" /> FastAPI Microservice Predictions Endpoint
              </label>
              <input
                type="text"
                value={modelEndpoint}
                onChange={(e) => setModelEndpoint(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 focus:border-red-500 focus:bg-white focus:outline-none shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">PostgreSQL Snapshot Backup Routine</label>
              <select
                value={backupSchedule}
                onChange={(e) => setBackupSchedule(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer shadow-sm"
              >
                <option value="Hourly">Hourly Continuous Backup</option>
                <option value="Daily">Daily Backup (Midnight UTC)</option>
                <option value="Weekly">Weekly Backup (Sunday UTC)</option>
              </select>
            </div>

            <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-4">
              <div>
                {settingsSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" /> System telemetries committed successfully!
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" /> {savingSettings ? 'Committing Configs...' : 'Save Telemetry Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsPage;
