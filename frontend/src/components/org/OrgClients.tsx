import React, { useMemo, useState } from 'react';
import { Building2, Plus, Search, Pencil, KeyRound, Ban, CheckCircle2, Loader2, X, Users, GraduationCap, Wand2 } from '../icons';
import { LICENSABLE_MODULES } from '../../config/navigation';
import { useOrgClients, type OrgClient, type NewClientInput } from './useOrgClients';

const moduleLabel = (id: string) => LICENSABLE_MODULES.find((m) => m.id === id)?.label ?? id;

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const inputCls = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400';
const labelCls = 'mb-1 block text-xs font-semibold text-slate-600';

export const StatusBadge: React.FC<{ status: OrgClient['status'] }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
    {status === 'ACTIVE' ? 'Active' : 'Suspended'}
  </span>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }> = ({ checked, onChange, disabled, label }) => (
  <button
    type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-indigo-500' : 'bg-slate-300'}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <h3 className="text-base font-bold text-[var(--color-ink)]">{title}</h3>
        <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const ModulePicker: React.FC<{ value: string[]; onChange: (v: string[]) => void }> = ({ value, onChange }) => (
  <div className="space-y-2">
    {LICENSABLE_MODULES.map((m) => (
      <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">{m.label}</p>
          <p className="text-xs text-slate-500">{m.description}</p>
        </div>
        <Toggle label={`Enable ${m.label}`} checked={value.includes(m.id)} onChange={(on) => onChange(on ? [...value, m.id] : value.filter((x) => x !== m.id))} />
      </div>
    ))}
  </div>
);

const ErrorLine: React.FC<{ msg: string }> = ({ msg }) => (msg ? <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{msg}</p> : null);

// ─── create ────────────────────────────────────────────────────────────────
const CreateClientModal: React.FC<{ onClose: () => void; onCreate: (i: NewClientInput) => Promise<{ ok: boolean; error?: string }> }> = ({ onClose, onCreate }) => {
  const [f, setF] = useState({ name: '', code: '', contactName: '', contactEmail: '', contactPhone: '', adminName: '', adminEmail: '', adminPassword: randomPassword() });
  const [modules, setModules] = useState<string[]>(LICENSABLE_MODULES.map((m) => m.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const r = await onCreate({
      name: f.name.trim(), code: f.code.trim() || undefined, enabledModules: modules,
      contactName: f.contactName.trim() || null, contactEmail: f.contactEmail.trim() || null, contactPhone: f.contactPhone.trim() || null,
      admin: { name: f.adminName.trim(), email: f.adminEmail.trim(), password: f.adminPassword },
    });
    setBusy(false);
    if (r.ok) onClose(); else setError(r.error || 'Could not create client');
  };

  return (
    <Modal title="New client" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">School</h4>
          <div><label className={labelCls}>School name *</label><input required minLength={2} className={inputCls} value={f.name} onChange={set('name')} placeholder="Sunrise Public School" /></div>
          <div>
            <label className={labelCls}>Client code <span className="font-normal text-slate-400">(unique id, optional)</span></label>
            <input className={inputCls} value={f.code} onChange={set('code')} placeholder={slugify(f.name) || 'sunrise-public-school'} pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" title="3-40 characters: lowercase letters, digits, hyphens" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Contact person</label><input className={inputCls} value={f.contactName} onChange={set('contactName')} /></div>
            <div><label className={labelCls}>Contact phone</label><input className={inputCls} value={f.contactPhone} onChange={set('contactPhone')} /></div>
          </div>
          <div><label className={labelCls}>Contact email</label><input type="email" className={inputCls} value={f.contactEmail} onChange={set('contactEmail')} /></div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Modules this client can use</h4>
          <ModulePicker value={modules} onChange={setModules} />
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">School administrator login</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Name *</label><input required minLength={2} className={inputCls} value={f.adminName} onChange={set('adminName')} /></div>
            <div><label className={labelCls}>Email (login) *</label><input required type="email" className={inputCls} value={f.adminEmail} onChange={set('adminEmail')} /></div>
          </div>
          <div>
            <label className={labelCls}>Initial password * <span className="font-normal text-slate-400">(share it with the school securely)</span></label>
            <div className="flex gap-2">
              <input required minLength={8} className={`${inputCls} font-mono`} value={f.adminPassword} onChange={set('adminPassword')} />
              <button type="button" onClick={() => setF((p) => ({ ...p, adminPassword: randomPassword() }))} className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><Wand2 className="h-3.5 w-3.5" />Generate</button>
            </div>
          </div>
        </section>

        <ErrorLine msg={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Create client
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── edit ──────────────────────────────────────────────────────────────────
const EditClientModal: React.FC<{ client: OrgClient; onClose: () => void; onSave: (patch: Partial<OrgClient>) => Promise<{ ok: boolean; error?: string }> }> = ({ client, onClose, onSave }) => {
  const [f, setF] = useState({ name: client.name, contactName: client.contactName ?? '', contactEmail: client.contactEmail ?? '', contactPhone: client.contactPhone ?? '', notes: client.notes ?? '' });
  const [modules, setModules] = useState<string[]>(client.enabledModules);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const r = await onSave({
      name: f.name.trim(), enabledModules: modules,
      contactName: f.contactName.trim() || null, contactEmail: f.contactEmail.trim() || null, contactPhone: f.contactPhone.trim() || null, notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (r.ok) onClose(); else setError(r.error || 'Could not save');
  };

  return (
    <Modal title={`Edit ${client.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div><label className={labelCls}>School name *</label><input required minLength={2} className={inputCls} value={f.name} onChange={set('name')} /></div>
        <p className="-mt-3 text-xs text-slate-400">Client code: <span className="font-mono">{client.code}</span> (cannot be changed)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Contact person</label><input className={inputCls} value={f.contactName} onChange={set('contactName')} /></div>
          <div><label className={labelCls}>Contact phone</label><input className={inputCls} value={f.contactPhone} onChange={set('contactPhone')} /></div>
        </div>
        <div><label className={labelCls}>Contact email</label><input type="email" className={inputCls} value={f.contactEmail} onChange={set('contactEmail')} /></div>
        <div><label className={labelCls}>Internal notes</label><input className={inputCls} value={f.notes} onChange={set('notes')} placeholder="Plan, renewal date, …" /></div>
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Modules this client can use</h4>
          <ModulePicker value={modules} onChange={setModules} />
          <p className="mt-2 text-xs text-slate-400">Changes reach the school's signed-in users within about a minute.</p>
        </div>
        <ErrorLine msg={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── reset admin password ──────────────────────────────────────────────────
const ResetPasswordModal: React.FC<{ client: OrgClient; onClose: () => void; onReset: (password: string) => Promise<{ ok: boolean; error?: string; email?: string }> }> = ({ client, onClose, onReset }) => {
  const [password, setPassword] = useState(randomPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneFor, setDoneFor] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const r = await onReset(password);
    setBusy(false);
    if (r.ok) setDoneFor(r.email || 'the school admin'); else setError(r.error || 'Could not reset password');
  };

  return (
    <Modal title={`Reset admin password — ${client.name}`} onClose={onClose}>
      {doneFor ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Password updated for <strong>{doneFor}</strong>. They have been signed out everywhere. Share the new password securely:</p>
          <p className="rounded-md bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">{password}</p>
          <div className="flex justify-end"><button onClick={onClose} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Done</button></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-600">Sets a new password for the school's main administrator (the first admin account created for it) and signs them out everywhere.</p>
          <div>
            <label className={labelCls}>New password *</label>
            <div className="flex gap-2">
              <input required minLength={8} className={`${inputCls} font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setPassword(randomPassword())} className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><Wand2 className="h-3.5 w-3.5" />Generate</button>
            </div>
          </div>
          <ErrorLine msg={error} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Reset password</button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// ─── screen ────────────────────────────────────────────────────────────────
export const OrgClients: React.FC = () => {
  const { clients, loading, error, reload, createClient, updateClient, resetAdminPassword } = useOrgClients();
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ kind: 'create' } | { kind: 'edit' | 'reset'; client: OrgClient } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.code.includes(q) || (c.contactEmail ?? '').toLowerCase().includes(q)) : clients;
  }, [clients, query]);

  const toggleStatus = async (c: OrgClient) => {
    const suspend = c.status === 'ACTIVE';
    if (suspend && !window.confirm(`Suspend ${c.name}? Their users will be signed out and cannot log in until you reactivate the account.`)) return;
    setBusyId(c._id); setNotice('');
    const r = await updateClient(c._id, { status: suspend ? 'SUSPENDED' : 'ACTIVE' });
    setBusyId(null);
    setNotice(r.ok ? `${c.name} ${suspend ? 'suspended' : 'reactivated'}.` : r.error);
  };

  const totals = useMemo(() => ({
    active: clients.filter((c) => c.status === 'ACTIVE').length,
    students: clients.reduce((s, c) => s + c.studentCount, 0),
  }), [clients]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-ink)]">Clients</h2>
          <p className="text-sm text-slate-500">Schools on the platform and the modules each one may use.</p>
        </div>
        <button onClick={() => setModal({ kind: 'create' })} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />New client
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total clients', value: clients.length, tint: 'from-indigo-500/[0.07] border-indigo-500/15', icon: Building2 },
          { label: 'Active', value: totals.active, tint: 'from-emerald-500/[0.07] border-emerald-500/15', icon: CheckCircle2 },
          { label: 'Students across clients', value: totals.students.toLocaleString('en-IN'), tint: 'from-amber-500/[0.07] border-amber-500/15', icon: GraduationCap },
        ].map(({ label, value, tint, icon: Icon }) => (
          <div key={label} className={`flex items-center justify-between rounded-lg border bg-white bg-gradient-to-br ${tint} to-white p-5 shadow-sm`}>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-800">{value}</p></div>
            <span className="rounded-lg border border-slate-200/70 bg-white/70 p-2.5 text-slate-500"><Icon className="h-5 w-5" /></span>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients…" className={`${inputCls} pl-9`} />
      </div>

      {notice && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{notice}</p>}
      {error && (
        <p className="flex items-center justify-between rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}
          <button onClick={reload} className="font-semibold underline">Retry</button></p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading clients…</div>
        ) : shown.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">{clients.length === 0 ? 'No clients yet. Create the first one.' : 'No clients match your search.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase">
                  <th className="px-4 py-3">School</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Modules</th>
                  <th className="px-4 py-3">Usage</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((c) => (
                  <tr key={c._id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--color-ink)]">{c.name}</p>
                      <p className="text-xs text-slate-400"><span className="font-mono">{c.code}</span>{c.contactEmail ? ` · ${c.contactEmail}` : ''}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.enabledModules.length === 0 && <span className="text-xs text-slate-400">None</span>}
                        {c.enabledModules.map((m) => <span key={m} className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">{moduleLabel(m)}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span className="mr-3 inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.userCount}</span>
                      <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{c.studentCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button title="Edit & modules" onClick={() => setModal({ kind: 'edit', client: c })} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Pencil className="h-4 w-4" /></button>
                        <button title="Reset admin password" onClick={() => setModal({ kind: 'reset', client: c })} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><KeyRound className="h-4 w-4" /></button>
                        <button
                          title={c.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'} disabled={busyId === c._id} onClick={() => toggleStatus(c)}
                          className={`rounded-md p-2 ${c.status === 'ACTIVE' ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {busyId === c._id ? <Loader2 className="h-4 w-4 animate-spin" /> : c.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.kind === 'create' && <CreateClientModal onClose={() => setModal(null)} onCreate={async (i) => { const r = await createClient(i); if (r.ok) setNotice(`${i.name} created. Admin login: ${i.admin.email}`); return r.ok ? { ok: true } : { ok: false, error: r.error }; }} />}
      {modal?.kind === 'edit' && <EditClientModal client={modal.client} onClose={() => setModal(null)} onSave={async (p) => { const r = await updateClient(modal.client._id, p as any); return r.ok ? { ok: true } : { ok: false, error: r.error }; }} />}
      {modal?.kind === 'reset' && <ResetPasswordModal client={modal.client} onClose={() => setModal(null)} onReset={async (pw) => { const r = await resetAdminPassword(modal.client._id, pw); return r.ok ? { ok: true, email: r.data.email } : { ok: false, error: r.error }; }} />}
    </div>
  );
};
