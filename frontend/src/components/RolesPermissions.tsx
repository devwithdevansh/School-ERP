import React, { useState } from 'react';
import { ShieldCheck, Pencil, Check, X, ShieldAlert } from 'lucide-react';
import { useApp } from '../store';
import { PERMISSIONS_GROUPS } from '../constants/permissions';

export const RolesPermissions: React.FC = () => {
  const { users, authFetch, refreshData } = useApp();
  
  // Filter staff/teachers
  const staffList = users.filter((u: any) => u.role === 'STAFF' || u.role === 'TEACHER');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const startEditing = (user: any) => {
    setEditingUserId(user._id);
    setTempPermissions(user.permissions || []);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setTempPermissions([]);
  };

  const togglePermission = (permId: string) => {
    setTempPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const savePermissions = async (userId: string) => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/users/${userId}/teacher-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: tempPermissions })
      });
      if (res.ok) {
        await refreshData();
        setEditingUserId(null);
      } else {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to save permissions');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50/50 min-h-[calc(100vh-2rem)] p-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-indigo-500" />
            Roles & Permissions
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage granular module access for all staff members.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-64">Staff Member</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Phone / Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Module Access</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                  No staff members found.
                </td>
              </tr>
            ) : (
              staffList.map((user: any) => {
                const isEditing = editingUserId === user._id;
                const userPerms = isEditing ? tempPermissions : (user.permissions || []);
                
                return (
                  <tr key={user._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-6 align-top">
                      <div className="font-bold text-slate-800 text-sm uppercase">{user.name}</div>
                      <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1 uppercase border border-indigo-100">
                        {user.role}
                      </div>
                    </td>
                    <td className="px-6 py-6 align-top text-sm text-slate-600 font-medium">
                      {user.contactNo1 || '-'}
                      {user.email && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">{user.email}</div>}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {isEditing ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner max-h-[400px] overflow-y-auto">
                          {PERMISSIONS_GROUPS.map((group, gIdx) => (
                            <div key={gIdx} className="mb-6 last:mb-0">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{group.groupName}</h4>
                              <div className="flex flex-wrap gap-2">
                                {group.permissions.map(p => {
                                  const active = userPerms.includes(p.id);
                                  return (
                                    <button
                                      key={p.id}
                                      onClick={() => togglePermission(p.id)}
                                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                                        active 
                                          ? 'bg-[#134e4a] text-white border-[#134e4a] shadow-sm' 
                                          : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                                      }`}
                                    >
                                      {p.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {userPerms.length === 0 ? (
                            <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-md border border-dashed border-slate-200">
                              <ShieldAlert className="w-3.5 h-3.5" /> No permissions assigned
                            </span>
                          ) : (
                            PERMISSIONS_GROUPS.flatMap(g => g.permissions)
                              .filter(p => userPerms.includes(p.id))
                              .map(p => (
                                <span key={p.id} className="bg-[#134e4a] text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap">
                                  {p.label}
                                </span>
                              ))
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-6 align-top text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={cancelEditing}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => savePermissions(user._id)}
                            disabled={saving}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Save Permissions"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => startEditing(user)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
