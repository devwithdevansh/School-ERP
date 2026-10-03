// Creates: the platform owner (ORG_ADMIN), a first client (school) with all modules enabled, that school's
// admin login, its current academic year and system fee categories.
// Safe to re-run: existing rows are left untouched.   Usage: npm run seed
// (Run migrations 0001 + 0002 first.)
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { rawDb } from '../config/supabase.js';
import { MODULE_IDS } from '../constants/modules.js';
import { provisionTenantDefaults } from '../services/clients.js';

const orgEmail = (process.env.SEED_ORG_EMAIL || 'org@platform.local').toLowerCase();
const orgPassword = process.env.SEED_ORG_PASSWORD || 'ChangeMe@123';
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@school.local').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123';
const schoolName = process.env.SEED_SCHOOL_NAME || 'Demo School';
const schoolCode = process.env.SEED_SCHOOL_CODE || 'demo-school';

const fail = (what, error) => { console.error(`Could not ${what}:`, error.message); process.exit(1); };

const { data: org } = await rawDb.from('users').select('id').eq('email', orgEmail).maybeSingle();
if (org) {
  console.log(`Organization admin ${orgEmail} already exists.`);
} else {
  const { error } = await rawDb.from('users').insert({ name: 'Organization Admin', email: orgEmail, password_hash: await bcrypt.hash(orgPassword, 12), role: 'ORG_ADMIN' });
  if (error) fail('create organization admin', error);
  console.log(`Created organization admin ${orgEmail} / ${orgPassword}  (change this password!)`);
}

let { data: client } = await rawDb.from('clients').select('*').eq('code', schoolCode).maybeSingle();
if (!client) {
  const res = await rawDb.from('clients').insert({ name: schoolName, code: schoolCode, enabled_modules: MODULE_IDS }).select('*').single();
  if (res.error) fail('create client', res.error);
  client = res.data;
  console.log(`Created client "${schoolName}" (${schoolCode}) with modules: ${MODULE_IDS.join(', ')}`);
}

const { data: existing } = await rawDb.from('users').select('id').eq('email', email).maybeSingle();
if (existing) {
  console.log(`School admin ${email} already exists.`);
} else {
  const { error } = await rawDb.from('users').insert({ name: 'Administrator', email, password_hash: await bcrypt.hash(password, 12), role: 'ADMIN', client_id: client.id });
  if (error) fail('create school admin', error);
  console.log(`Created school admin ${email} / ${password}  (change this password!)`);
}

await provisionTenantDefaults(client.id);
console.log('Done.');
