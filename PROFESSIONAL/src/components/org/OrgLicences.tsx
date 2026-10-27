import React, { useMemo, useState } from 'react';
import {
  Loader2,
  Search,
  CheckCircle2,
  X,
  Smartphone,
  Globe,
  Sparkles,
  Sliders,
  Check,
  Building2,
  ShieldCheck,
  Layers,
} from '../icons';
import { LICENSABLE_MODULES, type LicensableModule } from '../../config/navigation';
import { useOrgClients, type OrgClient } from './useOrgClients';
import { StatusBadge, Toggle } from './OrgClients';

const CATEGORY_META: Record<string, { label: string; icon: string; desc: string }> = {
  FEES: { label: 'Fees & Financials', icon: '💰', desc: 'Fee collection, dues, offline/online receipts and expenses' },
  ACADEMICS: { label: 'Student Management & Academics', icon: '🎓', desc: 'Core student directory, admissions, curriculum, attendance and exams' },
  STAFF: { label: 'Staff & Administration', icon: '👥', desc: 'Staff directory, role permissions and staff leave operations' },
  SETTINGS: { label: 'Configuration & Security', icon: '⚙️', desc: 'Classes, sections, mediums and audit trails' },
  COMMUNICATION: { label: 'Communication Hub', icon: '💬', desc: 'WhatsApp notifications, chat circulars and push alerts' },
  INTEGRATIONS: { label: 'Advanced Integrations', icon: '🔌', desc: 'Biometric punch logs, SMS gateways and GPS transport' },
};

const BASIC_PRESET_MODULES = [
  'FEES', 'FEES_COLLECT', 'FEES_UNPAID', 'FEES_RECEIPTS', 'FEES_STRUCTURE',
  'ERP', 'STUDENTS', 'ADMISSION', 'SUBJECTS', 'ATTENDANCE', 'TIMETABLE',
  'STAFF_DIRECTORY', 'SETUP_SECTIONS', 'NOTIFICATIONS', 'CALENDAR',
];

const STANDARD_PRESET_MODULES = [
  ...BASIC_PRESET_MODULES,
  'FEES_EXPENSES', 'FEES_ONLINE', 'TEACHER_ALLOCATION', 'STUDENT_LEAVE',
  'HOMEWORK', 'EXAMS', 'RESULTS', 'CERTIFICATES', 'ROLES_PERMISSIONS',
  'STAFF_LEAVE', 'LEAVE', 'COMMUNICATION', 'WHATSAPP', 'AUDIT_LOGS',
];

const CUSTOM_PRESET_MODULES = LICENSABLE_MODULES.map((m) => m.id);

/** Full module configuration modal for an individual school. */
const ModuleManagerModal: React.FC<{
  client: OrgClient;
  onClose: () => void;
  onSave: (patch: { enabledModules: string[]; plan: 'BASIC' | 'STANDARD' | 'CUSTOM'; appType: 'NONE' | 'UNIVERSAL' | 'CUSTOM'; appId?: string | null }) => Promise<{ ok: boolean; error?: string }>;
}> = ({ client, onClose, onSave }) => {
  const [selectedModules, setSelectedModules] = useState<string[]>(client.enabledModules || []);
  const [plan, setPlan] = useState<'BASIC' | 'STANDARD' | 'CUSTOM'>(client.plan || 'STANDARD');
  const [appType, setAppType] = useState<'NONE' | 'UNIVERSAL' | 'CUSTOM'>(client.appType || (client.plan === 'BASIC' ? 'NONE' : 'UNIVERSAL'));
  const [appId, setAppId] = useState(client.appId || '');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const applyPlanPreset = (targetPlan: 'BASIC' | 'STANDARD' | 'CUSTOM') => {
    setPlan(targetPlan);
    if (targetPlan === 'BASIC') {
      setSelectedModules(BASIC_PRESET_MODULES);
      setAppType('NONE');
    } else if (targetPlan === 'STANDARD') {
      setSelectedModules(STANDARD_PRESET_MODULES);
      setAppType('UNIVERSAL');
    } else {
      setSelectedModules(CUSTOM_PRESET_MODULES);
      setAppType('CUSTOM');
      if (!appId) setAppId(`com.schoolerp.${client.code.replace(/-/g, '_')}`);
    }
  };

  const filteredModules = useMemo(() => {
    return LICENSABLE_MODULES.filter((m) => {
      const matchesSearch =
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === 'ALL' || m.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [search, activeTab]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(LICENSABLE_MODULES.map((m) => m.category)));
    return list;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    const res = await onSave({
      enabledModules: selectedModules,
      plan,
      appType,
      appId: appType === 'CUSTOM' ? (appId.trim() || null) : null,
    });
    setSaving(false);
    if (res.ok) {
      onClose();
    } else {
      setErr(res.error || 'Failed to save configuration');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-800">{client.name}</h3>
              <span className="font-mono text-xs text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">{client.code}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Configure subscription plan, mobile delivery, and each licensed module.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {err && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
              {err}
            </div>
          )}

          {/* Section 1: Subscription Plan & Mobile Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plan Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription Plan Tier</span>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {plan} PLAN
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPlanPreset('BASIC')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    plan === 'BASIC'
                      ? 'border-amber-500 bg-amber-50/60 text-amber-900 shadow-sm ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-sm">🌟</span>
                  <span className="text-xs font-bold mt-1">Basic</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Web Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPlanPreset('STANDARD')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    plan === 'STANDARD'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-sm ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-sm">🚀</span>
                  <span className="text-xs font-bold mt-1">Standard</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Universal App</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPlanPreset('CUSTOM')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    plan === 'CUSTOM'
                      ? 'border-purple-600 bg-purple-50/60 text-purple-900 shadow-sm ring-2 ring-purple-600/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-sm">👑</span>
                  <span className="text-xs font-bold mt-1">Customized</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Dedicated App</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {plan === 'BASIC' && 'Web-only delivery. Mobile login is restricted and parents/teachers are directed to web portal.'}
                {plan === 'STANDARD' && 'Includes Web ERP + "School Connect" universal mobile app for parents & teachers.'}
                {plan === 'CUSTOM' && 'Dedicated branded APK (e.g. "EduConnect" or school\'s own app package on Play Store).'}
              </p>
            </div>

            {/* Mobile Delivery Mode */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mobile App Delivery</span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {appType}
                </span>
              </div>
              <select
                value={appType}
                onChange={(e) => setAppType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="NONE">🌐 Web Only — No Mobile App (Basic Plan)</option>
                <option value="UNIVERSAL">📱 Universal App — "School Connect" (Standard Plan)</option>
                <option value="CUSTOM">🚀 Custom Dedicated App — "EduConnect" / Custom APK</option>
              </select>

              {appType === 'CUSTOM' && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-slate-600">Dedicated Play Store Package ID</label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="com.schoolerp.educonnect"
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/30 px-3 py-1.5 text-xs font-mono text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-slate-400">School app boots directly into this school context without code entry.</p>
                </div>
              )}

              {appType === 'NONE' && (
                <p className="text-[11px] text-amber-700 bg-amber-50/60 p-2 rounded-xl border border-amber-200">
                  Mobile access is blocked. Any attempts to discover or login to this school on mobile will show an Upgrade prompt.
                </p>
              )}

              {appType === 'UNIVERSAL' && (
                <p className="text-[11px] text-indigo-700 bg-indigo-50/60 p-2 rounded-xl border border-indigo-200">
                  Parents &amp; teachers enter school code <strong>{client.code}</strong> inside the universal <em>School Connect</em> mobile app.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Granular Module Checklist */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-800">Licensed Product Modules</h4>
                <p className="text-xs text-slate-500">
                  <strong>{selectedModules.length}</strong> of <strong>{LICENSABLE_MODULES.length}</strong> modules active
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedModules(BASIC_PRESET_MODULES)}
                  className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 font-bold border border-amber-200 hover:bg-amber-100"
                >
                  Select Basic ({BASIC_PRESET_MODULES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModules(STANDARD_PRESET_MODULES)}
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 text-indigo-800 font-bold border border-indigo-200 hover:bg-indigo-100"
                >
                  Select Standard ({STANDARD_PRESET_MODULES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModules(CUSTOM_PRESET_MODULES)}
                  className="rounded-lg bg-purple-50 px-2.5 py-1 text-purple-800 font-bold border border-purple-200 hover:bg-purple-100"
                >
                  Select All ({CUSTOM_PRESET_MODULES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModules([])}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Filter and Category Tabs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search features (e.g. Attendance, Receipts, WhatsApp, Exams)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({LICENSABLE_MODULES.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveTab(cat)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                      activeTab === cat
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {filteredModules.map((m) => {
                const isChecked = selectedModules.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-indigo-300 bg-indigo-50/30 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{m.label}</span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            m.tier === 'BASIC'
                              ? 'bg-amber-100 text-amber-800'
                              : m.tier === 'STANDARD'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {m.tier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{m.description}</p>
                      <p className="text-[9px] font-mono text-slate-400">ID: {m.id}</p>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <div
                        className={`h-5 w-5 rounded-lg flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="text-xs text-slate-500">
            Selected: <strong className="text-slate-800">{selectedModules.length}</strong> modules · Plan: <strong className="text-slate-800">{plan}</strong> · Mobile: <strong className="text-slate-800">{appType}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save &amp; Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Matrix and management interface of clients × plans × modules. */
export const OrgLicences: React.FC = () => {
  const { clients, loading, error, reload, updateClient } = useOrgClients();
  const [selectedClient, setSelectedClient] = useState<OrgClient | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const handleUpdate = async (
    clientId: string,
    patch: { enabledModules?: string[]; plan?: 'BASIC' | 'STANDARD' | 'CUSTOM'; appType?: 'NONE' | 'UNIVERSAL' | 'CUSTOM'; appId?: string | null }
  ) => {
    setPendingId(clientId);
    setMessage('');
    const res = await updateClient(clientId, patch);
    setPendingId(null);
    if (!res.ok) {
      setMessage(res.error || 'Failed to update client');
      return { ok: false as const, error: res.error };
    }
    setMessage('Client license and plan updated successfully!');
    setTimeout(() => setMessage(''), 4000);
    return { ok: true as const };
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Module Licences &amp; Plans</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage granular product features, subscription tiers (Basic, Standard, Custom), and mobile deployment for each school.
          </p>
        </div>
      </div>

      {/* Plan Tier Architecture Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🌟</span>
            <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">Basic Plan</h4>
          </div>
          <p className="text-xs text-amber-900 font-semibold">Web ERP Only</p>
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            Fees, Attendance, Students, and Reports. Mobile app access is blocked and prompts upgrade.
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🚀</span>
            <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">Standard Plan</h4>
          </div>
          <p className="text-xs text-indigo-900 font-semibold">Web + "School Connect" App</p>
          <p className="text-[11px] text-indigo-800/80 leading-relaxed">
            Full Academic Suite + Universal Play Store app where parents &amp; teachers enter school code.
          </p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">👑</span>
            <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">Customized Plan</h4>
          </div>
          <p className="text-xs text-purple-900 font-semibold">Web + Dedicated "EduConnect" App</p>
          <p className="text-[11px] text-purple-800/80 leading-relaxed">
            Dedicated Play Store APK with school's own logo, package ID, custom reports, and SMS/biometric.
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={reload} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Main Client Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search school name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredClients.length} of {clients.length} school clients
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Loading schools &amp; license configurations…
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-16 text-center text-sm text-slate-500">
            No school clients found. Create one under School Clients.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">School Client</th>
                  <th className="px-5 py-3.5">Subscription Plan</th>
                  <th className="px-5 py-3.5">Mobile Delivery</th>
                  <th className="px-5 py-3.5">Licensed Modules</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((c) => {
                  const activeCount = (c.enabledModules || []).length;
                  const totalCount = LICENSABLE_MODULES.length;
                  const planTier = c.plan || 'STANDARD';
                  const isBusy = pendingId === c._id;

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* School Name & Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-slate-900">{c.name}</p>
                            <p className="font-mono text-[11px] text-slate-400">{c.code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Subscription Plan Switcher */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <select
                            disabled={isBusy}
                            value={planTier}
                            onChange={async (e) => {
                              const newPlan = e.target.value as 'BASIC' | 'STANDARD' | 'CUSTOM';
                              const newAppType = newPlan === 'BASIC' ? 'NONE' : newPlan === 'CUSTOM' ? 'CUSTOM' : 'UNIVERSAL';
                              const presetModules = newPlan === 'BASIC' ? BASIC_PRESET_MODULES : newPlan === 'STANDARD' ? STANDARD_PRESET_MODULES : CUSTOM_PRESET_MODULES;
                              await handleUpdate(c._id, { plan: newPlan, appType: newAppType, enabledModules: presetModules });
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                              planTier === 'BASIC'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-500'
                                : planTier === 'CUSTOM'
                                ? 'bg-purple-50 text-purple-800 border-purple-300 focus:ring-purple-500'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-300 focus:ring-indigo-500'
                            }`}
                          >
                            <option value="BASIC">🌟 Basic Plan</option>
                            <option value="STANDARD">🚀 Standard Plan</option>
                            <option value="CUSTOM">👑 Customized Plan</option>
                          </select>
                        </div>
                      </td>

                      {/* Mobile Delivery */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <select
                            disabled={isBusy}
                            value={c.appType || (c.plan === 'BASIC' ? 'NONE' : 'UNIVERSAL')}
                            onChange={async (e) => {
                              const newAppType = e.target.value as 'NONE' | 'UNIVERSAL' | 'CUSTOM';
                              await handleUpdate(c._id, { appType: newAppType });
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="NONE">🌐 Web Only (No Mobile)</option>
                            <option value="UNIVERSAL">📱 Universal App (School Connect)</option>
                            <option value="CUSTOM">🚀 Custom App (EduConnect / Dedicated)</option>
                          </select>
                          {c.appType === 'CUSTOM' && c.appId && (
                            <p className="text-[10px] font-mono text-purple-600 truncate max-w-[200px]" title={c.appId}>
                              {c.appId}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Licensed Modules */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-800">
                              {activeCount} / {totalCount} Active
                            </span>
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full"
                                style={{ width: `${(activeCount / totalCount) * 100}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[220px]">
                            {activeCount === totalCount
                              ? 'All 31 features unlocked'
                              : `${(c.enabledModules || []).slice(0, 3).join(', ')}...`}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedClient(c)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          Configure Modules
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Module Manager Modal for Selected Client */}
      {selectedClient && (
        <ModuleManagerModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSave={async (patch) => {
            const r = await handleUpdate(selectedClient._id, patch);
            if (r.ok) {
              await reload();
            }
            return r;
          }}
        />
      )}
    </div>
  );
};
