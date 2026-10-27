import React, { useState, useEffect } from 'react';
import { Smartphone, Building2, Check, Copy, ToggleRight, Loader2, Plus, Globe, ArrowRight, ShieldCheck, RefreshCw } from '../icons';
import { LICENSABLE_MODULES } from '../../config/navigation';
import { useOrgClients, type OrgClient } from './useOrgClients';
import { Toggle, StatusBadge } from './OrgClients';

export const OrgAppDeployment: React.FC = () => {
  const { clients, loading, error, reload, updateClient } = useOrgClients();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'apps' | 'modules' | 'inspector'>('apps');
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [inspectorInput, setInspectorInput] = useState('com.schoolerp.educonnect');
  const [inspectorType, setInspectorType] = useState<'appId' | 'code'>('appId');
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorResult, setInspectorResult] = useState<any>(null);

  // New custom app modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customAppName, setCustomAppName] = useState('');
  const [customAppId, setCustomAppId] = useState('');
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#4f46e5');
  const [savingApp, setSavingApp] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleModule = async (clientId: string, current: string[], moduleId: string, on: boolean) => {
    const next = on ? [...current, moduleId] : current.filter((m) => m !== moduleId);
    setPendingToggle(`${clientId}:${moduleId}`);
    await updateClient(clientId, { enabledModules: next });
    setPendingToggle(null);
  };

  const runInspector = async () => {
    setInspectorLoading(true);
    setInspectorResult(null);
    try {
      const endpoint = inspectorType === 'appId'
        ? `/api/v1/platform/app-config?appId=${encodeURIComponent(inspectorInput.trim())}`
        : `/api/v1/platform/school-lookup?code=${encodeURIComponent(inspectorInput.trim())}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setInspectorResult(data);
    } catch (err: any) {
      setInspectorResult({ error: err.message || 'Network error' });
    } finally {
      setInspectorLoading(false);
    }
  };

  const handleRegisterCustomApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    setSavingApp(true);
    try {
      await updateClient(selectedClientId, {
        appId: customAppId.trim(),
        appType: 'CUSTOM',
        branding: {
          appName: customAppName.trim(),
          primaryColor: customPrimaryColor,
        },
      });
      setShowAddModal(false);
      setSelectedClientId('');
      setCustomAppName('');
      setCustomAppId('');
      reload();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingApp(false);
    }
  };

  // Find clients configured with custom apps
  const customAppClients = clients.filter((c: any) => c.appId || c.code === 'educonnect');

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Smartphone className="h-4 w-4" />
            Developer Platform Console • Release Factory
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Mobile App Deployment Hub</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Configure white-label school listings for Google Play Store, manage granular feature flags per client, and trigger 1-click build pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Register White-Label App
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('apps')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'apps'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📱 Registered Play Store Apps (2)
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'modules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🎛️ Granular Feature Flags Matrix
        </button>
        <button
          onClick={() => setActiveTab('inspector')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'inspector'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🔍 Live Mobile Config Inspector
        </button>
      </div>

      {/* Tab 1: Apps */}
      {activeTab === 'apps' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Universal App: School Connect */}
            <div className="rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                Universal Multi-Tenant
              </div>

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-2xl shadow-inner">
                  SC
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">School Connect</h3>
                  <p className="font-mono text-xs text-indigo-600 mt-0.5">com.schoolerp.school_connect</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Universal companion app for parents & teachers. Supports all schools via school code discovery or registered mobile OTP lookup.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Audience</span>
                    <strong className="text-slate-800">All Registered Schools</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">First Launch Flow</span>
                    <strong className="text-slate-800">School Code / Mobile Login</strong>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-xs relative group">
                  <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold mb-1">
                    PowerShell 1-Click Build Command:
                  </span>
                  <div className="overflow-x-auto select-all pr-8">
                    powershell .\build-app.ps1 -App school_connect
                  </div>
                  <button
                    onClick={() => copyToClipboard('powershell .\\build-app.ps1 -App school_connect', 'cmd-sc')}
                    className="absolute right-2.5 top-6 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy command"
                  >
                    {copiedKey === 'cmd-sc' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Custom App: EduConnect */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                White-Label Branded
              </div>

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center text-white font-black text-2xl shadow-inner">
                  EC
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">EduConnect</h3>
                  <p className="font-mono text-xs text-emerald-600 mt-0.5">com.schoolerp.educonnect</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Dedicated custom branded app with tailored school emblem, direct school binding, and custom theme presets.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Bound School</span>
                    <strong className="text-slate-800">EduConnect Academy</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">First Launch Flow</span>
                    <strong className="text-slate-800">Direct Login (No School Code)</strong>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-xs relative group">
                  <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold mb-1">
                    PowerShell 1-Click Build Command:
                  </span>
                  <div className="overflow-x-auto select-all pr-8">
                    powershell .\build-app.ps1 -App educonnect -AppId "com.schoolerp.educonnect" -Name "EduConnect"
                  </div>
                  <button
                    onClick={() => copyToClipboard('powershell .\\build-app.ps1 -App educonnect -AppId "com.schoolerp.educonnect" -Name "EduConnect"', 'cmd-ec')}
                    className="absolute right-2.5 top-6 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy command"
                  >
                    {copiedKey === 'cmd-ec' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* White-Label School Apps Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900">Custom White-Label School Deployments</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Schools with dedicated Application IDs published or queued for Google Play Store.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="px-5 py-3">School Client</th>
                    <th className="px-5 py-3">Play Store App ID</th>
                    <th className="px-5 py-3">App Name</th>
                    <th className="px-5 py-3 text-center">Active Modules</th>
                    <th className="px-5 py-3 text-right">Build Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">EduConnect Academy</p>
                      <p className="font-mono text-xs text-slate-400">code: educonnect</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-indigo-600 font-semibold">
                      com.schoolerp.educonnect
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 font-bold">
                      EduConnect
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-xs">
                        {LICENSABLE_MODULES.length} Modules Active
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => copyToClipboard('powershell .\\build-app.ps1 -App educonnect -AppId "com.schoolerp.educonnect" -Name "EduConnect"', 'cmd-table-ec')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {copiedKey === 'cmd-table-ec' ? 'Copied!' : 'Copy Build Script'}
                      </button>
                    </td>
                  </tr>

                  {customAppClients.filter((c: any) => c.code !== 'educonnect').map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="font-mono text-xs text-slate-400">code: {c.code}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-indigo-600 font-semibold">
                        {c.appId || `com.schoolerp.${c.code}`}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700 font-bold">
                        {c.branding?.appName || c.name}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-xs">
                          {(c.enabledModules || []).length} Modules Active
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => copyToClipboard(`powershell .\\build-app.ps1 -App ${c.code} -AppId "${c.appId || `com.schoolerp.${c.code}`}" -Name "${c.branding?.appName || c.name}"`, `cmd-${c._id}`)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          {copiedKey === `cmd-${c._id}` ? 'Copied!' : 'Copy Build Script'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Granular Feature Flags Matrix */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 leading-relaxed">
            <strong className="font-bold">How Module Gating Works:</strong> When you flip any feature toggle off for a school, the mobile app immediately hides that card on the student/parent dashboard and blocks the underlying backend API endpoint.
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading client module matrix...
              </div>
            ) : clients.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No school clients found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                      <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">School</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {LICENSABLE_MODULES.map((m) => (
                        <th key={m.id} className="px-3 py-3 text-center font-bold text-[10px] tracking-tight whitespace-nowrap" title={m.description}>
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 sticky left-0 bg-white z-10 shadow-xs">
                          <p className="font-bold text-slate-900 text-xs">{c.name}</p>
                          <p className="font-mono text-[10px] text-slate-400">{c.code}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={c.status} />
                        </td>
                        {LICENSABLE_MODULES.map((m) => {
                          const key = `${c._id}:${m.id}`;
                          const isEnabled = (c.enabledModules || []).includes(m.id);
                          return (
                            <td key={m.id} className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                {pendingToggle === key ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : (
                                  <Toggle
                                    label={`${m.label} for ${c.name}`}
                                    checked={isEnabled}
                                    disabled={pendingToggle !== null}
                                    onChange={(on) => handleToggleModule(c._id, c.enabledModules || [], m.id, on)}
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Live Mobile Config Inspector */}
      {activeTab === 'inspector' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Live Mobile Runtime Endpoint Inspector</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify what the Flutter app receives when it boots up and calls <code className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">/api/v1/platform/app-config</code> or <code className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">/api/v1/platform/school-lookup</code>.
            </p>

            <div className="mt-4 flex flex-col md:flex-row gap-3 items-center">
              <select
                value={inspectorType}
                onChange={(e: any) => setInspectorType(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50"
              >
                <option value="appId">By Application ID (app-config)</option>
                <option value="code">By School Code (school-lookup)</option>
              </select>

              <input
                type="text"
                value={inspectorInput}
                onChange={(e) => setInspectorInput(e.target.value)}
                placeholder={inspectorType === 'appId' ? 'e.g. com.schoolerp.educonnect' : 'e.g. educonnect'}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800"
              />

              <button
                onClick={runInspector}
                disabled={inspectorLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                {inspectorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Execute Test Request
              </button>
            </div>

            {inspectorResult && (
              <div className="mt-5 rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96">
                <pre>{JSON.stringify(inspectorResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Register White-Label App */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Register New White-Label App</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bind a custom Google Play Store Application ID to an existing school client.
            </p>

            <form onSubmit={handleRegisterCustomApp} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select School Client *</label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    const selected = clients.find((c) => c._id === e.target.value);
                    if (selected) {
                      setCustomAppName(selected.name);
                      setCustomAppId(`com.schoolerp.${selected.code}`);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800"
                >
                  <option value="">-- Choose School Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom App Name (Play Store Title) *</label>
                <input
                  type="text"
                  required
                  value={customAppName}
                  onChange={(e) => setCustomAppName(e.target.value)}
                  placeholder="e.g. Desai Education"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Application ID (Package Name) *</label>
                <input
                  type="text"
                  required
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  placeholder="e.g. com.schoolerp.desai"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                  />
                  <span className="font-mono text-xs text-slate-600">{customPrimaryColor}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingApp}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  {savingApp && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save & Register App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
