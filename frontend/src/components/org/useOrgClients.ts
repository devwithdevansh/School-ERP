import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../store';

export type ClientStatus = 'ACTIVE' | 'SUSPENDED';

export interface OrgClient {
  _id: string;
  name: string;
  code: string;
  status: ClientStatus;
  enabledModules: string[];
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  userCount: number;
  studentCount: number;
  admins?: { _id: string; name: string; email: string | null; isActive: boolean; lastLogin: string | null }[];
}

export interface NewClientInput {
  name: string;
  code?: string;
  enabledModules: string[];
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  notes?: string | null;
  admin: { name: string; email: string; password: string };
}

export type ClientPatch = Partial<Pick<OrgClient, 'name' | 'status' | 'enabledModules' | 'contactName' | 'contactEmail' | 'contactPhone' | 'address' | 'notes'>>;

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Loads and mutates clients through the organization API (ORG_ADMIN only). */
export function useOrgClients() {
  const { authFetch } = useApp();
  const [clients, setClients] = useState<OrgClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const call = useCallback(async <T,>(method: string, path: string, body?: unknown): Promise<Result<T>> => {
    try {
      const res = await authFetch(`/api/v1/organization${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = json?.errors?.[0]?.message;
        return { ok: false, error: detail ? `${json.message}: ${detail}` : json?.message || `Request failed (${res.status})` };
      }
      return { ok: true, data: json.data as T };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error' };
    }
  }, [authFetch]);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await call<OrgClient[]>('GET', '/clients');
    if (r.ok) { setClients(r.data); setError(''); } else setError(r.error);
    setLoading(false);
  }, [call]);

  useEffect(() => { reload(); }, [reload]);

  const replace = (c: OrgClient) => setClients((prev) => prev.map((x) => (x._id === c._id ? { ...x, ...c } : x)));

  return {
    clients, loading, error, reload,
    async createClient(input: NewClientInput) {
      const r = await call<OrgClient>('POST', '/clients', input);
      if (r.ok) await reload();
      return r;
    },
    async updateClient(id: string, patch: ClientPatch) {
      const r = await call<OrgClient>('PATCH', `/clients/${id}`, patch);
      if (r.ok) replace(r.data);
      return r;
    },
    resetAdminPassword: (id: string, password: string, adminId?: string) =>
      call<{ email: string }>('POST', `/clients/${id}/reset-admin-password`, { password, adminId }),
  };
}
