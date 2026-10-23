import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, Pencil, Check, X, AlertTriangle, Layers,
  FileSpreadsheet, Users, CreditCard, Wallet, Receipt, Settings, Search,
  Plus, Trash2, Eye, Lock
} from './icons';
import { useApp } from '../store';
import {
  GRANULAR_PERMISSION_MATRIX,
  DEFAULT_CLIENT_STAFF_PERMISSIONS,
  PRESET_PROFILES,
  type PermissionId,
  type ModulePermissionGroup
} from '../config/permissionsRegistry';

export const RolesPermissions: React.FC = () => {
  const { users, authFetch, refreshData, currentUser, setCurrentUser } = useApp();

  // Search & staff selection
  const [searchTerm, setSearchTerm] = useState('');
  const staffList = useMemo(() => {
    return users
      .filter((u: any) => u.role !== 'ORG_ADMIN')
      .filter((u: any) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.contactNo1 && u.contactNo1.includes(searchTerm))
      );
  }, [users, searchTerm]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(() => {
    return users.find((u: any) => u._id === selectedUserId) || staffList[0] || null;
  }, [users, selectedUserId, staffList]);

  // Working permissions state for the currently selected user
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [highRiskPrompt, setHighRiskPrompt] = useState<{ id: PermissionId; label: string } | null>(null);

  // Sync temp permissions when user selection changes
  React.useEffect(() => {
    if (selectedUser) {
      if (Array.isArray(selectedUser.permissions) && selectedUser.permissions.length > 0) {
        setTempPermissions(selectedUser.permissions);
      } else if (selectedUser.role === 'ADMIN') {
        const fullPerms = PRESET_PROFILES.find((p) => p.id === 'FULL_ADMIN')?.permissions || [];
        setTempPermissions(fullPerms);
      } else {
        setTempPermissions(DEFAULT_CLIENT_STAFF_PERMISSIONS);
      }
    }
  }, [selectedUser]);

  // Toggle a single permission token
  const togglePermission = (permId: PermissionId, isHighRisk = false, label = '') => {
    const isCurrentlyActive = tempPermissions.includes(permId);

    // If turning ON a high risk action, show confirmation prompt
    if (!isCurrentlyActive && isHighRisk) {
      setHighRiskPrompt({ id: permId, label });
      return;
    }

    setTempPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // Toggle entire screen (and its sub-actions if turned off)
  const toggleScreen = (group: ModulePermissionGroup) => {
    const screenPerm = group.screenPermission;
    const isScreenOn = tempPermissions.includes(screenPerm);

    if (isScreenOn) {
      // Turn off screen and all its actions
      const actionIds = group.actions.map((a) => a.id);
      setTempPermissions((prev) =>
        prev.filter((p) => p !== screenPerm && !actionIds.includes(p as any))
      );
    } else {
      // Turn on screen (with confirmation if high-risk)
      if (group.riskLevel === 'HIGH') {
        setHighRiskPrompt({ id: screenPerm, label: group.moduleName });
      } else {
        setTempPermissions((prev) => [...prev, screenPerm]);
      }
    }
  };

  // Apply a preset
  const applyPreset = (presetId: string) => {
    const preset = PRESET_PROFILES.find((p) => p.id === presetId);
    if (preset) {
      setTempPermissions(preset.permissions);
    }
  };

  // Save to backend
  const savePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await authFetch(`/api/v1/users/${selectedUser._id}/teacher-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: tempPermissions }),
      });
      if (res.ok) {
        await refreshData();
        const activeUserId = localStorage.getItem('userId');
        const activeEmail = currentUser?.email?.toLowerCase().trim();
        if (
          (selectedUser._id && String(selectedUser._id) === String(activeUserId)) ||
          (selectedUser.email && selectedUser.email.toLowerCase().trim() === activeEmail)
        ) {
          setCurrentUser((prev) => {
            if (!prev) return null;
            const updated = { ...prev, permissions: tempPermissions };
            localStorage.setItem('currentUser', JSON.stringify(updated));
            return updated;
          });
        }
        setSuccessMsg(`Permissions successfully updated for ${selectedUser.name}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to save permissions');
      }
    } catch (err) {
      alert('Network error while saving permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Separate standard groups from high-risk groups
  const standardGroups = useMemo(() => {
    return GRANULAR_PERMISSION_MATRIX.filter((m) => m.riskLevel !== 'HIGH');
  }, []);

  const highRiskGroups = useMemo(() => {
    return GRANULAR_PERMISSION_MATRIX.filter((m) => m.riskLevel === 'HIGH');
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Roles & Granular Permissions
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Deeply control which screens and capabilities (View, Add, Edit, Delete, High-Risk) are granted per staff account.
          </p>
        </div>

        {selectedUser && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (selectedUser.permissions) setTempPermissions(selectedUser.permissions);
                else setTempPermissions(DEFAULT_CLIENT_STAFF_PERMISSIONS);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={savePermissions}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: User Selector on Left + Permissions Workspace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Staff Accounts List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Staff & Users</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {staffList.length} Accounts
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name or phone..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>

            {/* User List */}
            <div className="max-h-[560px] overflow-y-auto space-y-1.5 pr-1 side-scroll">
              {staffList.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">No staff members found.</p>
              ) : (
                staffList.map((user: any) => {
                  const isSelected = selectedUser?._id === user._id;
                  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const permCount = Array.isArray(user.permissions) ? user.permissions.length : 0;

                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => setSelectedUserId(user._id)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {user.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            user.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-800'
                              : user.role === 'TEACHER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {user.role}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {permCount > 0 ? `${permCount} perms` : 'Safe Defaults'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deep Granular Permissions Matrix */}
        <div className="lg:col-span-8 space-y-5">
          {selectedUser ? (
            <>
              {/* Active User Card & Quick Presets Bar */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-600/20">
                      {selectedUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{selectedUser.name}</h3>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                          {selectedUser.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {selectedUser.email || selectedUser.contactNo1 || 'Staff Account'} ·{' '}
                        <strong className="text-indigo-600 font-bold">{tempPermissions.length} Active Permissions</strong>
                      </p>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('DEFAULT_STAFF')}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/70 hover:bg-emerald-100 transition-colors"
                      title="Recommended safe defaults: fees, dues, student view, no Promote or Import Excel"
                    >
                      Safe Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('CASHIER')}
                      className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200/70 hover:bg-blue-100 transition-colors"
                    >
                      Cashier
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('OFFICE_MANAGER')}
                      className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 border border-purple-200/70 hover:bg-purple-100 transition-colors"
                    >
                      Office Mgr
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('FULL_ADMIN')}
                      className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200/70 hover:bg-amber-100 transition-colors"
                    >
                      Full Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Standard Everyday Operations Matrix */}
              <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Standard Daily Modules</h4>
                    <p className="text-[11px] text-slate-400">Regular fee collection, receipts, expenses, and roster management.</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Toggles apply immediately on Save</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {standardGroups.map((group) => {
                    const isScreenActive = tempPermissions.includes(group.screenPermission);

                    return (
                      <div key={group.screenId} className={`p-4 transition-colors ${isScreenActive ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleScreen(group)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isScreenActive ? 'bg-indigo-600' : 'bg-slate-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isScreenActive ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span className={`text-xs font-bold ${isScreenActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                {group.moduleName}
                              </span>
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-500">
                                {isScreenActive ? 'Visible in Sidebar' : 'Hidden'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 ml-11">{group.description}</p>
                          </div>

                          {/* Granular Action Chips */}
                          {group.actions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pl-11 sm:pl-0">
                              {group.actions.map((act) => {
                                const isActionActive = tempPermissions.includes(act.id);
                                return (
                                  <button
                                    key={act.id}
                                    type="button"
                                    onClick={() => togglePermission(act.id, act.riskLevel === 'HIGH', act.label)}
                                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all ${
                                      isActionActive
                                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                                    }`}
                                    title={act.description}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${isActionActive ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                    {act.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CRITICAL / HIGH-RISK SAFEGUARDS (Strictly Protected) */}
              <div className="rounded-3xl border border-rose-200 bg-rose-50/20 overflow-hidden shadow-sm">
                <div className="bg-rose-50 px-5 py-3.5 border-b border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-600 text-white">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                        Critical Operations & High-Risk Safeguards
                      </h4>
                      <p className="text-[11px] text-rose-700/80 font-medium">
                        Strictly locked by default. Only grant to authorized staff after explicit confirmation.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-700 uppercase">
                    Admin Privilege
                  </span>
                </div>

                <div className="divide-y divide-rose-100 bg-white">
                  {highRiskGroups.map((group) => {
                    const isScreenActive = tempPermissions.includes(group.screenPermission);

                    return (
                      <div key={group.screenId} className={`p-4 transition-colors ${isScreenActive ? 'bg-rose-50/20' : 'bg-white'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleScreen(group)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isScreenActive ? 'bg-rose-600' : 'bg-slate-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isScreenActive ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span className={`text-xs font-bold ${isScreenActive ? 'text-rose-900' : 'text-slate-600'}`}>
                                {group.moduleName}
                              </span>
                              <span className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                                isScreenActive
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isScreenActive ? 'UNLOCKED / ACTIVE' : 'LOCKED (Safe)'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 ml-11 font-medium">{group.description}</p>
                          </div>

                          {/* Action toggle */}
                          {group.actions.map((act) => {
                            const isActionActive = tempPermissions.includes(act.id);
                            return (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => togglePermission(act.id, true, act.label)}
                                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all pl-11 sm:pl-3 ${
                                  isActionActive
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${isActionActive ? 'bg-white' : 'bg-rose-400'}`} />
                                {act.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              <ShieldCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Select a staff member from the left to configure their permissions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for High-Risk Operations */}
      {highRiskPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center">Enable High-Risk Operation?</h3>
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              You are about to authorize <strong>"{highRiskPrompt.label}"</strong> for{' '}
              <strong>{selectedUser?.name}</strong>.
            </p>
            <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-100 p-3 text-[11px] text-rose-800 font-medium">
              ⚠️ This feature can permanently modify academic cohorts, advance student grades, or bulk overwrite financial ledger balances.
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setHighRiskPrompt(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempPermissions((prev) => [...prev, highRiskPrompt.id]);
                  setHighRiskPrompt(null);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
              >
                Yes, Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
