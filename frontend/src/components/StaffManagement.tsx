import React, { useState } from 'react';
import { useApp } from '../store';
import { UserPlus, Users, ShieldCheck, ShieldOff, KeyRound, Eye, EyeOff, Trash2, Pencil } from 'lucide-react';
import { TeacherPermissionsModal } from './TeacherPermissionsModal';

export const StaffManagement: React.FC = () => {
  const { currentUser, authFetch, users, refreshData, activePortal } = useApp();
  
  const staffMembers = users.filter((u: any) => u.role !== 'ADMIN');

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'STAFF' | 'TEACHER'>('STAFF');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetNewPassword] = useState('');

  // Teacher Profile Modal
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);

  const defaultHeaders = { 'Content-Type': 'application/json' };

  const handleCreate = async () => {
    setFormError('');
    if (!formName.trim() || (!formEmail.trim() && !formPhone.trim()) || !formPassword.trim()) {
      setFormError('Name, password, and either Email or Phone are required');
      return;
    }
    if (formPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/api/v1/users', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ 
          name: formName.trim(), 
          email: formEmail.trim() ? formEmail.trim().toLowerCase() : undefined, 
          phone: formPhone.trim() || undefined,
          password: formPassword,
          role: formRole
        })
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || 'Failed to create account');
        return;
      }
      setShowForm(false);
      setFormName(''); setFormEmail(''); setFormPhone(''); setFormPassword(''); setFormRole('STAFF');
      refreshData();
    } catch (err) {
      setFormError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (userId: string) => {
    await authFetch(`/api/v1/users/${userId}/toggle-status`, { method: 'PATCH' });
    refreshData();
  };

  const handleResetPassword = async () => {
    if (!resetUserId || resetPassword.length < 6) return;
    await authFetch(`/api/v1/users/${resetUserId}/reset-password`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({ newPassword: resetPassword })
    });
    setResetUserId(null);
    setResetNewPassword('');
    alert('Password reset successfully!');
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the account for "${name}"? This action cannot be undone.`)) return;
    const res = await authFetch(`/api/v1/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      refreshData();
    } else {
      const data = await res.json();
      alert(data.message || 'Failed to delete staff account');
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p className="text-slate-400 font-bold text-lg">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-500" /> Staff & Teachers
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage portal access, roles, and permissions.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-md"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </header>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">Create New Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Foram Shah"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="teacher@school.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
              <input
                type="tel"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
              <select
                value={formRole}
                onChange={e => setFormRole(e.target.value as 'STAFF' | 'TEACHER')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all font-medium text-slate-700"
              >
                <option value="STAFF">Staff (Reception / Office)</option>
                <option value="TEACHER">Teacher</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all font-medium text-slate-700 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          
          {formError && (
            <div className="mb-4 text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
              {formError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md"
            >
              {creating ? 'Creating...' : 'Create Account'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-500 hover:text-slate-700 px-4 py-2 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <p className="font-semibold">No staff or teachers found.</p>
                  </td>
                </tr>
              ) : (
                staffMembers.map((user: any) => (
                  <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-600 font-bold flex items-center justify-center shrink-0">
                          {user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                        user.role === 'TEACHER' 
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(user._id)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                          user.isActive
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {user.isActive ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        {user.isActive ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {activePortal === 'ERP' && (
                          <button
                            onClick={() => setEditingTeacher(user)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors group relative"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                              Edit Details & Permissions
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => setResetUserId(user._id)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group relative"
                        >
                          <KeyRound className="h-4 w-4" />
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                            Reset Password
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(user._id, user.name)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                            Delete Account
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" /> Reset Password
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              Enter a new password for this staff member. They can use this to login immediately.
            </p>
            <input
              type="text"
              value={resetPassword}
              onChange={e => setResetNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium text-slate-700"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setResetUserId(null); setResetNewPassword(''); }}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPassword.length < 6}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Permissions Modal */}
      {editingTeacher && (
        <TeacherPermissionsModal 
          user={editingTeacher} 
          onClose={() => setEditingTeacher(null)} 
          onSaved={() => {
            setEditingTeacher(null);
            refreshData();
          }} 
        />
      )}
    </div>
  );
};
