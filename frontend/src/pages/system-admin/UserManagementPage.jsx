import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { Users, UserPlus, ShieldAlert, ToggleLeft, ToggleRight, Check, Trash } from 'lucide-react';
import Modal from '../../components/common/Modal';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User input creation modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    role: 'doctor',
    email: '',
    department: 'Cardiology'
  });

  const loadUsersList = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers();
      setUsers(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  const handleToggleStatus = async (userId) => {
    try {
      await adminService.toggleUserStatus(userId);
      loadUsersList(); // reload
    } catch (err) {
      alert("Error toggling active directory user state: " + err.message);
    }
  };

  const handleRoleChange = async (userId, pathRole) => {
    try {
      await adminService.updateUserRole(userId, pathRole);
      loadUsersList();
    } catch (err) {
      alert("Error updating user capabilities role: " + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminService.addUser(newUser);
      setCreateModalOpen(false);
      setNewUser({
        username: '',
        name: '',
        role: 'doctor',
        email: '',
        department: 'Cardiology'
      });
      loadUsersList();
    } catch (err) {
      alert("Error creating staff record: " + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Querying staff credentials index..." />;
  if (error) return <ErrorState error={error} onRetry={loadUsersList} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Access Control & User Management" 
        description="Verify identities, toggle active credentials, and adjust role capabilities."
        actions={
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Provision Staff User
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-55/30 text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Name / Username</th>
                <th className="py-4 px-6 font-heading">Security Role</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800">{u.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{u.username}</div>
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      <option value="doctor">Doctor</option>
                      <option value="hospital-admin">Hospital Admin</option>
                      <option value="researcher">Researcher</option>
                      <option value="system-admin">System Admin</option>
                    </select>
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-semibold">{u.email}</td>
                  <td className="py-4 px-6 text-slate-500 font-semibold">{u.department || 'All clinical sectors'}</td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className="inline-flex items-center gap-1 cursor-pointer"
                      title={u.status === 'Active' ? 'Suspend User' : 'Activate User'}
                    >
                      {u.status === 'Active' ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <ToggleRight className="h-6 w-6 text-emerald-600 shrink-0" />
                          <span className="text-[10px] font-extrabold uppercase">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-450 hover:text-red-500">
                          <ToggleLeft className="h-6 w-6 text-slate-400 shrink-0" />
                          <span className="text-[10px] font-extrabold uppercase">Suspended</span>
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => alert("Deleting accounts requires multi-factor clearance keys.")}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition cursor-pointer"
                      title="Deprovision record"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account provision Modal form */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision Active Directory Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Identity Name</label>
              <input
                type="text"
                required
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                placeholder="e.g. Stephen Strange"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Login Username</label>
              <input
                type="text"
                required
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                placeholder="stephen.strange"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Credentials Email</label>
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                placeholder="s.strange@stjude.org"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target Capability Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="doctor">Doctor</option>
                <option value="hospital-admin">Hospital Admin</option>
                <option value="researcher">Researcher</option>
                <option value="system-admin">System Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 font-heading">Department Wards Allocation</label>
              <select
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Endocrinology">Endocrinology</option>
                <option value="Pulmonology">Pulmonology</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Provision Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
