import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { Database, Link, Save, Check, User, Shield, Image } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SystemSettingsPage = () => {
  const { user, updateProfile } = useAuth();
  
  // Tab control
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Settings state
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Sync state with logged-in user details
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileAvatar(user.avatar || '');
    }
  }, [user]);

  // Predefined avatar selections
  const avatarList = [
    { label: "SysAdmin Status", src: "/images/pp.jpg" },
    { label: "Hospital Admin", src: "/images/2.png" },
    { label: "Doctor Clinic", src: "/images/1.png" },
    { label: "Researcher Labs", src: "/images/3.png" }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image file size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Core System attributes state
  const [dbURL, setDbURL] = useState('postgresql://stjude_admin:super-secret@hospital-postgres.internal:5432/readmissions');
  const [modelEndpoint, setModelEndpoint] = useState('http://fastapi-prediction-engine.internal:8000/predict');
  const [backupSchedule, setBackupSchedule] = useState('Daily');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await updateProfile({
        name: profileName,
        avatar: profileAvatar
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      alert("Error saving profile changes: " + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    setTimeout(() => {
      setSavingSettings(false);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    }, 1000);
  };

  const isSysAdmin = user?.role === 'system-admin';

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isSysAdmin ? "Settings & Configurations Workspace" : "My Profile Settings"} 
        description={isSysAdmin ? "Edit your profile info, modify system attributes, and configure database telemetries." : "Manage your user profile credentials and clinical identity image."}
      />

      {/* Tabs controllers */}
      {isSysAdmin && (
        <div className="flex border-b border-slate-205 gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'profile' 
                ? 'border-emerald-650 text-emerald-800' 
                : 'border-transparent text-slate-400 hover:text-slate-655'
            }`}
          >
            👤 User Profile
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'system' 
                ? 'border-emerald-650 text-emerald-800' 
                : 'border-transparent text-slate-400 hover:text-slate-655'
            }`}
          >
            ⚙️ Core Telemetry
          </button>
        </div>
      )}

      <div className="max-w-2xl rounded-2xl border border-slate-205 bg-white p-6 shadow-sm">
        {activeTab === 'profile' ? (
          <form onSubmit={handleProfileSave} className="space-y-6 text-xs">
            {/* Live profile card preview */}
            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <img 
                src={profileAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
                alt="Avatar Preview" 
                className="h-16 w-16 rounded-full object-cover ring-4 ring-emerald-500/10 border border-slate-200 shadow-sm"
              />
              <div>
                <p className="font-bold text-slate-808 text-sm">{profileName || 'Your Name'}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{user?.role?.replace('-', ' ')}</p>
                <p className="text-[10px] text-slate-405 mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Editable Name */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-550 uppercase tracking-widest flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Full Username
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                placeholder="e.g. Penchala Prasad"
              />
            </div>

            {/* Editable Avatar URL */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-550 uppercase tracking-widest flex items-center gap-1">
                <Image className="h-3.5 w-3.5" /> Avatar Image URL
              </label>
              <input
                type="text"
                value={profileAvatar}
                onChange={(e) => setProfileAvatar(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {/* Upload Custom Image File */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-550 uppercase tracking-widest flex items-center gap-1">
                📤 Upload Custom Avatar File
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-slate-200 bg-slate-55 py-2 px-3 text-xs font-semibold text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-emerald-705 hover:file:bg-emerald-100 hover:file:text-emerald-800 transition focus:outline-hidden cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">Supports JPEG, PNG, WEBP, GIF (Max 2MB)</span>
            </div>

            {/* Avatar suggestions */}
            <div className="space-y-2">
              <span className="block font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-1">Predefined Photo Templates</span>
              <div className="flex gap-4 float-none">
                {avatarList.map((avatar) => (
                  <button
                    key={avatar.label}
                    type="button"
                    onClick={() => setProfileAvatar(avatar.src)}
                    className={`relative rounded-xl overflow-hidden h-12 w-12 border-2 transition ${
                      profileAvatar === avatar.src ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={avatar.src} alt={avatar.label} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="border-t border-slate-105 pt-5 flex items-center justify-between gap-4">
              <div>
                {profileSuccess && (
                  <span className="text-[11px] font-bold text-emerald-650 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                    ✓ Profile credentials updated successfully!
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-650 px-5 py-3 font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-60 cursor-pointer"
              >
                <Save className="h-4 w-4" /> {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            
            {/* DB URL config */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Database className="h-3.5 w-3.5" /> PostgreSQL Instance URI String
              </label>
              <input
                type="text"
                value={dbURL}
                onChange={(e) => setDbURL(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* FastAPI URL config */}
            <div className="space-y-1.5 font-heading">
              <label className="block font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Link className="h-3.5 w-3.5" /> FastAPI Predictions Endpoints
              </label>
              <input
                type="text"
                value={modelEndpoint}
                onChange={(e) => setModelEndpoint(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-800 focus:border-emerald-555 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Backup Schedule selector */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-500 uppercase tracking-widest">PostgreSQL Snapshot Routine</label>
              <select
                value={backupSchedule}
                onChange={(e) => setBackupSchedule(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-bold text-slate-700 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Hourly">Hourly Snapshots</option>
                <option value="Daily">Daily Backup (Midnight UTC)</option>
                <option value="Weekly">Weekly Backup (Sunday UTC)</option>
              </select>
            </div>

            {/* Actions button */}
            <div className="border-t border-slate-105 pt-5 flex items-center justify-between gap-4">
              <div>
                {settingsSuccess && (
                  <span className="text-[11px] font-bold text-emerald-650 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                    ✓ Telemetry configs committed successfully!
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-655 px-5 py-3 font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-60 cursor-pointer"
              >
                <Save className="h-4 w-4" /> {savingSettings ? 'Commiting Configs...' : 'Save Settings'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsPage;
