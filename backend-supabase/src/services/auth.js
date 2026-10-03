import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import env from '../config/env.js';
import { AppError, unwrap } from '../utils/http.js';
import { ORG_ADMIN_ROLE } from '../constants/modules.js';
import { loadClient, toSessionClient } from './clients.js';

/** Loads the client a user belongs to and refuses suspended or orphaned accounts. */
async function requireActiveClient(clientId) {
  const client = clientId ? await loadClient(clientId) : null;
  if (!client) throw new AppError('Your school account was not found. Contact your provider.', 403);
  if (client.status !== 'ACTIVE') throw new AppError('This school account is suspended. Contact your provider.', 403);
  return client;
}

const signAccess = (user) => jwt.sign(
  { id: user.id, role: user.role, ...(user.client_id ? { clientId: user.client_id } : {}) },
  env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN },
);

/** Current user + client (with enabled modules); the frontend uses it to (re)build its menu. */
export async function getContext(reqUser) {
  const { data: user } = await supabase.from('users').select('*').eq('id', reqUser.id).maybeSingle();
  if (!user || !user.is_active) throw new AppError('Account not found or deactivated', 401);
  const client = user.role === ORG_ADMIN_ROLE ? null : toSessionClient(await requireActiveClient(user.client_id));
  return { user: { name: user.name, email: user.email, role: user.role }, client };
}

async function issueSession(user) {
  const client = user.role === ORG_ADMIN_ROLE ? null : await requireActiveClient(user.client_id);
  const refreshPlain = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000).toISOString();

  // housekeeping: drop expired tokens and cap active ones at 10 per user
  await supabase.from('refresh_tokens').delete().eq('domain', 'user').eq('owner_id', user.id).lt('expires_at', new Date().toISOString());
  const { data: active } = await supabase.from('refresh_tokens').select('id').eq('domain', 'user').eq('owner_id', user.id).order('expires_at', { ascending: false });
  if (active && active.length >= 10) {
    await supabase.from('refresh_tokens').delete().in('id', active.slice(9).map((t) => t.id));
  }

  unwrap(await supabase.from('refresh_tokens').insert({
    domain: 'user', owner_id: user.id, token_hash: await bcrypt.hash(refreshPlain, 10), expires_at: expiresAt,
  }));
  await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

  return { accessToken: signAccess(user), refreshToken: refreshPlain, user: { name: user.name, role: user.role }, client: client ? toSessionClient(client) : null };
}

/** Login id may be an email or a phone number. */
async function findByLoginId(loginId) {
  const id = String(loginId || '').trim();
  const col = id.includes('@') ? 'email' : 'contact_no1';
  const { data, error } = await supabase.from('users').select('*').eq(col, col === 'email' ? id.toLowerCase() : id).maybeSingle();
  if (error) throw new AppError('Database error', 500);
  return data;
}

export async function portalLogin({ email, password }) {
  const user = await findByLoginId(email);
  // compare against a dummy hash when the user is missing so timing doesn't reveal which emails exist
  const ok = await bcrypt.compare(password, user?.password_hash || '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!user || !ok) throw new AppError('Invalid credentials', 401);
  if (!user.is_active) throw new AppError('Your account has been deactivated. Contact the administrator.', 403);
  if (user.role === 'TEACHER') throw new AppError('Teachers must use the school mobile app to sign in.', 403);
  return issueSession(user);
}

export async function refresh({ userId, refreshToken }) {
  const { data: tokens } = await supabase.from('refresh_tokens').select('*')
    .eq('domain', 'user').eq('owner_id', userId).gt('expires_at', new Date().toISOString());
  let match = null;
  for (const t of tokens || []) {
    if (await bcrypt.compare(refreshToken, t.token_hash)) { match = t; break; }
  }
  if (!match) throw new AppError('Refresh token invalid', 401);

  const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (!user || !user.is_active) throw new AppError('Account unavailable', 401);
  if (user.role !== ORG_ADMIN_ROLE) await requireActiveClient(user.client_id);

  // rotate: delete the used token, issue a new one
  await supabase.from('refresh_tokens').delete().eq('id', match.id);
  const newPlain = crypto.randomBytes(32).toString('hex');
  unwrap(await supabase.from('refresh_tokens').insert({
    domain: 'user', owner_id: userId, token_hash: await bcrypt.hash(newPlain, 10),
    expires_at: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000).toISOString(),
  }));
  return { accessToken: signAccess(user), refreshToken: newPlain };
}

export async function logout({ userId, refreshToken }) {
  const { data: tokens } = await supabase.from('refresh_tokens').select('*').eq('domain', 'user').eq('owner_id', userId);
  for (const t of tokens || []) {
    if (refreshToken && await bcrypt.compare(refreshToken, t.token_hash)) {
      await supabase.from('refresh_tokens').delete().eq('id', t.id);
      return;
    }
  }
}

export async function logoutAll(userId) {
  await supabase.from('refresh_tokens').delete().eq('domain', 'user').eq('owner_id', userId);
}
