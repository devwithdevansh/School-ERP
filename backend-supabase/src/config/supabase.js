import { createClient } from '@supabase/supabase-js';
import env from './env.js';
import { getTenantId } from '../utils/tenantContext.js';

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set - database calls will fail. Copy .env.example to .env.');
}

// Service-role client: bypasses RLS. Only ever used on the server.
export const rawDb = createClient(env.SUPABASE_URL || 'http://localhost', env.SUPABASE_SERVICE_ROLE_KEY || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Tables that carry a client_id column (see migrations/0002_multi_tenant.sql). */
export const TENANT_TABLES = new Set([
  'users', 'parents', 'academic_years', 'fee_categories', 'fee_structures', 'transport_fee_structures',
  'students', 'student_fee_ledgers', 'payments', 'audit_logs', 'expenses',
]);

/**
 * Tenant-aware entry point used by every service. While a request runs inside a tenant scope
 * (utils/tenantContext.js):
 *   select / update / delete  -> automatically add  .eq('client_id', <tenant>)
 *   insert / upsert           -> stamp client_id on every row (caller values are overridden)
 *   rpc                       -> passes p_client_id
 * Outside a scope (login, seed) it behaves exactly like the raw client.
 */
export function tenantFrom(table, tenantId = getTenantId()) {
  const t = rawDb.from(table);
  if (!tenantId || !TENANT_TABLES.has(table)) return t;
  const stamp = (rows) => (Array.isArray(rows) ? rows.map((r) => ({ ...r, client_id: tenantId })) : { ...rows, client_id: tenantId });
  return {
    select: (...a) => t.select(...a).eq('client_id', tenantId),
    insert: (rows, ...a) => t.insert(stamp(rows), ...a),
    upsert: (rows, ...a) => t.upsert(stamp(rows), ...a),
    update: (values, ...a) => t.update(values, ...a).eq('client_id', tenantId),
    delete: (...a) => t.delete(...a).eq('client_id', tenantId),
  };
}

const supabase = {
  from: (table) => tenantFrom(table),
  rpc: (fn, args = {}, opts) => {
    const id = getTenantId();
    return rawDb.rpc(fn, id ? { ...args, p_client_id: id } : args, opts);
  },
};

export default supabase;
