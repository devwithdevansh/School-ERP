// Organization-admin operations on clients (schools): onboarding, module licensing, suspension.
// Uses rawDb (unscoped): an ORG_ADMIN has no tenant, and every school-data query passes client_id explicitly.
import bcrypt from 'bcrypt';
import supabase, { rawDb } from '../config/supabase.js';
import { AppError, unwrap } from '../utils/http.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { createYear, ensureCategory } from './master.js';

const TTL_MS = 10_000; // module toggles / suspension take effect within ~10s
const cache = new Map();
export const invalidateClientCache = (id) => cache.delete(String(id));

export async function loadClient(id) {
  const key = String(id);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.client;
  const { data } = await rawDb.from('clients').select('*').eq('id', key).maybeSingle();
  cache.set(key, { client: data, at: Date.now() });
  return data;
}

/** API shape shared with backend-mongo (camelCase, `_id`). */
export const toClientDto = (c, extra = {}) => ({
  _id: c.id, name: c.name, code: c.code, status: c.status, enabledModules: c.enabled_modules,
  contactName: c.contact_name, contactEmail: c.contact_email, contactPhone: c.contact_phone,
  address: c.address, notes: c.notes, createdAt: c.created_at, ...extra,
});

/** Shape returned inside login / context responses. */
export const toSessionClient = (c) => ({ id: c.id, name: c.name, code: c.code, status: c.status, enabledModules: c.enabled_modules });

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const PROFILE = { name: 'name', contactName: 'contact_name', contactEmail: 'contact_email', contactPhone: 'contact_phone', address: 'address', notes: 'notes' };

async function usage(clientId) {
  const [u, s] = await Promise.all([
    rawDb.from('users').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    rawDb.from('students').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('is_active', true),
  ]);
  return { userCount: u.count || 0, studentCount: s.count || 0 };
}

export async function listClients() {
  const rows = unwrap(await rawDb.from('clients').select('*').order('created_at', { ascending: false }));
  return Promise.all(rows.map(async (c) => toClientDto(c, await usage(c.id))));
}

export async function getClient(id) {
  const { data: c } = await rawDb.from('clients').select('*').eq('id', id).maybeSingle();
  if (!c) throw new AppError('Client not found', 404);
  const admins = unwrap(await rawDb.from('users').select('id, name, email, contact_no1, is_active, last_login').eq('client_id', id).eq('role', 'ADMIN'))
    .map((a) => ({ _id: a.id, name: a.name, email: a.email, contactNo1: a.contact_no1, isActive: a.is_active, lastLogin: a.last_login }));
  return toClientDto(c, { ...(await usage(id)), admins });
}

/** Creates the client, its first school ADMIN login and default academic year / fee categories. */
export async function createClient({ name, code, enabledModules, admin, ...profile }) {
  const finalCode = code || slugify(name);
  if ((await rawDb.from('clients').select('id').eq('code', finalCode).maybeSingle()).data) throw new AppError(`Client code "${finalCode}" is already taken`, 409);
  const email = admin.email.toLowerCase().trim();
  if ((await rawDb.from('users').select('id').eq('email', email).maybeSingle()).data) throw new AppError('That admin email is already used by another account', 409);

  const row = { name, code: finalCode, enabled_modules: enabledModules };
  for (const [k, col] of Object.entries(PROFILE)) if (k !== 'name' && profile[k] !== undefined) row[col] = profile[k];
  const client = unwrap(await rawDb.from('clients').insert(row).select('*').single());
  try {
    unwrap(await rawDb.from('users').insert({
      name: admin.name, email, password_hash: await bcrypt.hash(admin.password, 12), role: 'ADMIN', client_id: client.id,
    }));
    await provisionTenantDefaults(client.id);
  } catch (err) {
    await rawDb.from('users').delete().eq('client_id', client.id);
    await rawDb.from('clients').delete().eq('id', client.id); // best-effort rollback of a half-created school
    throw err;
  }
  return getClient(client.id);
}

export async function updateClient(id, patch) {
  const update = {};
  for (const [k, col] of Object.entries(PROFILE)) if (patch[k] !== undefined) update[col] = patch[k];
  if (patch.status) update.status = patch.status;
  if (patch.enabledModules) update.enabled_modules = patch.enabledModules;
  const { data } = await rawDb.from('clients').update(update).eq('id', id).select('id').maybeSingle();
  if (!data) throw new AppError('Client not found', 404);
  invalidateClientCache(id);
  return getClient(id);
}

/** Sets a new password for one of the client's school admins (defaults to the oldest admin). */
export async function resetAdminPassword(id, { adminId, password }) {
  let q = rawDb.from('users').select('id, email').eq('client_id', id).eq('role', 'ADMIN').order('created_at').limit(1);
  if (adminId) q = q.eq('id', adminId);
  const { data } = await q;
  const admin = data?.[0];
  if (!admin) throw new AppError('No matching school admin found', 404);
  unwrap(await rawDb.from('users').update({ password_hash: await bcrypt.hash(password, 12) }).eq('id', admin.id));
  await rawDb.from('refresh_tokens').delete().eq('domain', 'user').eq('owner_id', admin.id); // sign the admin out everywhere
  return { _id: admin.id, email: admin.email };
}

const FEE_CATEGORIES = [
  ['EDUCATION', 'Education Fees', 'Standard monthly education fee'], ['TERM', 'Term Fees', 'Bi-annual term fee'],
  ['TRANSPORT', 'Transport Fees', 'Monthly transport fee'], ['ADMISSION', 'Admission Fees', 'One-time admission fee'],
  ['BAG_KIT', 'Bag & Kit', 'Bag & Kit fee category'],
];

/** Bootstraps a brand-new client: current academic year + system fee categories. Idempotent; also used by seed. */
export async function provisionTenantDefaults(clientId) {
  return runWithTenant(clientId, async () => {
    const { count } = await supabase.from('academic_years').select('id', { count: 'exact', head: true });
    if (!count) {
      const now = new Date();
      const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1; // academic year starts in June
      await createYear({ name: `${start}-${start + 1}`, startDate: `${start}-06-01`, endDate: `${start + 1}-05-31`, isActive: true });
    }
    for (const [type, name, description] of FEE_CATEGORIES) await ensureCategory(type, name, description);
  });
}
