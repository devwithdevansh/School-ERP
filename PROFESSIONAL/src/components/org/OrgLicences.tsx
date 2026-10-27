import React, { useState } from 'react';
import { Loader2 } from '../icons';
import { LICENSABLE_MODULES } from '../../config/navigation';
import { useOrgClients } from './useOrgClients';
import { StatusBadge, Toggle } from './OrgClients';

/** Matrix of clients × modules: flip a switch to grant or revoke a module immediately. */
export const OrgLicences: React.FC = () => {
  const { clients, loading, error, reload, updateClient } = useOrgClients();
  const [pending, setPending] = useState<string | null>(null); // `${clientId}:${moduleId}`
  const [message, setMessage] = useState('');

  const flip = async (clientId: string, current: string[], moduleId: string, on: boolean) => {
    const next = on ? [...current, moduleId] : current.filter((m) => m !== moduleId);
    setPending(`${clientId}:${moduleId}`); setMessage('');
    const r = await updateClient(clientId, { enabledModules: next });
    setPending(null);
    if (!r.ok) setMessage(r.error);
  };

  const applyPreset = async (clientId: string, plan: 'BASIC' | 'STANDARD' | 'CUSTOM') => {
    setPending(`${clientId}:plan`);
    setMessage('');
    let modules: string[] = [];
    let appType: 'NONE' | 'UNIVERSAL' | 'CUSTOM' = 'UNIVERSAL';

    if (plan === 'BASIC') {
      // Basic plan per checklist: Web only, Core modules
      modules = ['FEES', 'ATTENDANCE', 'ERP'];
      appType = 'NONE';
    } else if (plan === 'STANDARD') {
      // Standard plan per checklist: All academic modules + School Connect
      modules = LICENSABLE_MODULES.map((m) => m.id);
      appType = 'UNIVERSAL';
    } else {
      // Custom plan: Dedicated app + all modules
      modules = LICENSABLE_MODULES.map((m) => m.id);
      appType = 'CUSTOM';
    }

    const r = await updateClient(clientId, { plan, appType, enabledModules: modules });
    setPending(null);
    if (!r.ok) setMessage(r.error || 'Failed to update plan');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-ink)]">Module licences &amp; Plans</h2>
        <p className="text-sm text-slate-500">Configure client subscription plans and product modules. <strong>Basic Plan</strong> is Web-only. <strong>Standard Plan</strong> includes the universal <em>School Connect</em> mobile app. <strong>Custom Plan</strong> includes dedicated mobile apps like <em>EduConnect</em>.</p>
      </div>

      {message && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{message}</p>}
      {error && <p className="flex items-center justify-between rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}<button onClick={reload} className="font-semibold underline">Retry</button></p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No clients yet. Create one under Clients.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase">
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Delivery Plan</th>
                  <th className="px-4 py-3">Status</th>
                  {LICENSABLE_MODULES.map((m) => <th key={m.id} className="px-4 py-3 text-center" title={m.description}>{m.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c._id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--color-ink)]">{c.name}</p>
                      <p className="font-mono text-xs text-slate-400">{c.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            c.plan === 'BASIC' || c.appType === 'NONE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : c.plan === 'CUSTOM' || c.appType === 'CUSTOM'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {c.plan || 'STANDARD'} {c.appType === 'NONE' || c.plan === 'BASIC' ? '· WEB ONLY' : c.appType === 'CUSTOM' ? '· CUSTOM APP' : '· UNIVERSAL'}
                          </span>
                        </div>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            disabled={pending !== null}
                            onClick={() => applyPreset(c._id, 'BASIC')}
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
                            title="Set to Basic: Web-only access"
                          >
                            Basic
                          </button>
                          <button
                            type="button"
                            disabled={pending !== null}
                            onClick={() => applyPreset(c._id, 'STANDARD')}
                            className="rounded border border-indigo-200 bg-indigo-50/50 px-1.5 py-0.5 text-indigo-600 hover:bg-indigo-100 font-medium disabled:opacity-50"
                            title="Set to Standard: Universal App (School Connect)"
                          >
                            Standard
                          </button>
                          <button
                            type="button"
                            disabled={pending !== null}
                            onClick={() => applyPreset(c._id, 'CUSTOM')}
                            className="rounded border border-purple-200 bg-purple-50/50 px-1.5 py-0.5 text-purple-600 hover:bg-purple-100 font-medium disabled:opacity-50"
                            title="Set to Custom: Dedicated App (EduConnect)"
                          >
                            Custom
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    {LICENSABLE_MODULES.map((m) => {
                      const key = `${c._id}:${m.id}`;
                      return (
                        <td key={m.id} className="px-4 py-3">
                          <div className="flex justify-center">
                            {pending === key || pending === `${c._id}:plan`
                              ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                              : <Toggle label={`${m.label} for ${c.name}`} checked={c.enabledModules.includes(m.id)} disabled={pending !== null} onChange={(on) => flip(c._id, c.enabledModules, m.id, on)} />}
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
  );
};
