import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-ink)]">Module licences</h2>
        <p className="text-sm text-slate-500">Choose which product modules each client can use. A module that is switched off disappears from the school's menu and its API is blocked.</p>
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
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase">
                  <th className="px-4 py-3">School</th><th className="px-4 py-3">Status</th>
                  {LICENSABLE_MODULES.map((m) => <th key={m.id} className="px-4 py-3 text-center" title={m.description}>{m.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c._id}>
                    <td className="px-4 py-3"><p className="font-semibold text-[var(--color-ink)]">{c.name}</p><p className="font-mono text-xs text-slate-400">{c.code}</p></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    {LICENSABLE_MODULES.map((m) => {
                      const key = `${c._id}:${m.id}`;
                      return (
                        <td key={m.id} className="px-4 py-3">
                          <div className="flex justify-center">
                            {pending === key
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
