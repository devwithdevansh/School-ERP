import '../config/tenancy.js'; // must run before any model is compiled
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/User.js';

let mongo;
let server;
let base;
let orgToken;

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const login = async (email, password) => (await call('POST', '/auth/portal/login', { body: { email, password } }));

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  await User.create({ name: 'Org', email: 'org@platform.test', passwordHash: await bcrypt.hash('OrgPass#123', 4), role: 'ORG_ADMIN' });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
  orgToken = (await login('org@platform.test', 'OrgPass#123')).body.data.accessToken;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await mongo.stop();
});

const newClient = (name, code, modules, email) => call('POST', '/organization/clients', {
  token: orgToken,
  body: { name, code, enabledModules: modules, admin: { name: `${name} Admin`, email, password: 'SchoolPass#1' } },
});

describe('organization admin', () => {
  test('org admin logs in with no client; org routes need ORG_ADMIN', async () => {
    const r = await login('org@platform.test', 'OrgPass#123');
    expect(r.body.data.user.role).toBe('ORG_ADMIN');
    expect(r.body.data.client).toBeNull();
    expect((await call('GET', '/organization/clients')).status).toBe(401);
  });

  test('creates clients with module licences and provisions defaults', async () => {
    const a = await newClient('Alpha School', 'alpha-school', ['FEES'], 'admin@alpha.test');
    expect(a.status).toBe(201);
    expect(a.body.data.enabledModules).toEqual(['FEES']);
    expect(a.body.data.admins).toHaveLength(1);
    expect((await newClient('Beta School', 'beta-school', ['ERP', 'FEES'], 'admin@beta.test')).status).toBe(201);
    expect((await newClient('Dup', 'alpha-school', [], 'x@dup.test')).status).toBe(409);
    expect((await newClient('Dup2', 'dup-two', [], 'admin@alpha.test')).status).toBe(409);
    const list = await call('GET', '/organization/clients', { token: orgToken });
    expect(list.body.data).toHaveLength(2);
  });

  test('school admin sees only own client + enabled modules; login carries them', async () => {
    const r = await login('admin@alpha.test', 'SchoolPass#1');
    expect(r.status).toBe(200);
    expect(r.body.data.client.enabledModules).toEqual(['FEES']);
    const ctx = await call('GET', '/auth/context', { token: r.body.data.accessToken });
    expect(ctx.body.data.client.code).toBe('alpha-school');
  });

  test('module gate: FEES-only school can use fees but not ERP routes', async () => {
    const t = (await login('admin@alpha.test', 'SchoolPass#1')).body.data.accessToken;
    expect((await call('GET', '/fee-categories', { token: t })).status).toBe(200);
    const erp = await call('GET', '/attendance/classes', { token: t });
    expect(erp.status).toBe(403);
    expect(erp.body.message).toMatch(/not enabled/i);
  });

  test('tenant isolation: each school only sees its own academic years / fee categories', async () => {
    const ta = (await login('admin@alpha.test', 'SchoolPass#1')).body.data.accessToken;
    const tb = (await login('admin@beta.test', 'SchoolPass#1')).body.data.accessToken;
    const ya = (await call('GET', '/academic-years', { token: ta })).body.data;
    const yb = (await call('GET', '/academic-years', { token: tb })).body.data;
    expect(ya).toHaveLength(1);
    expect(yb).toHaveLength(1);
    expect(ya[0]._id).not.toBe(yb[0]._id);
    const users = (await call('GET', '/users', { token: ta })).body.data;
    expect(JSON.stringify(users)).not.toContain('admin@beta.test');
  });

  test('org admin cannot read school data', async () => {
    expect((await call('GET', '/students', { token: orgToken })).status).toBe(403);
  });

  test('enabling / disabling modules takes effect for the school', async () => {
    const list = (await call('GET', '/organization/clients', { token: orgToken })).body.data;
    const alpha = list.find((c) => c.code === 'alpha-school');
    const upd = await call('PATCH', `/organization/clients/${alpha._id}`, { token: orgToken, body: { enabledModules: ['FEES', 'ERP'] } });
    expect(upd.body.data.enabledModules.sort()).toEqual(['ERP', 'FEES']);
    const t = (await login('admin@alpha.test', 'SchoolPass#1')).body.data.accessToken;
    const ctx = await call('GET', '/auth/context', { token: t });
    expect(ctx.body.data.client.enabledModules.sort()).toEqual(['ERP', 'FEES']);
  });

  test('suspending a client blocks login and existing sessions; reactivating restores', async () => {
    const list = (await call('GET', '/organization/clients', { token: orgToken })).body.data;
    const beta = list.find((c) => c.code === 'beta-school');
    const t = (await login('admin@beta.test', 'SchoolPass#1')).body.data.accessToken;
    await call('PATCH', `/organization/clients/${beta._id}`, { token: orgToken, body: { status: 'SUSPENDED' } });
    expect((await login('admin@beta.test', 'SchoolPass#1')).status).toBe(403);
    expect((await call('GET', '/students', { token: t })).status).toBe(403);
    await call('PATCH', `/organization/clients/${beta._id}`, { token: orgToken, body: { status: 'ACTIVE' } });
    expect((await login('admin@beta.test', 'SchoolPass#1')).status).toBe(200);
  });

  test('reset school admin password', async () => {
    const list = (await call('GET', '/organization/clients', { token: orgToken })).body.data;
    const alpha = list.find((c) => c.code === 'alpha-school');
    const r = await call('POST', `/organization/clients/${alpha._id}/reset-admin-password`, { token: orgToken, body: { password: 'BrandNew#123' } });
    expect(r.status).toBe(200);
    expect((await login('admin@alpha.test', 'SchoolPass#1')).status).toBe(401);
    expect((await login('admin@alpha.test', 'BrandNew#123')).status).toBe(200);
  });

  test('school admins cannot use the organization API', async () => {
    const t = (await login('admin@alpha.test', 'BrandNew#123')).body.data.accessToken;
    expect((await call('GET', '/organization/clients', { token: t })).status).toBe(403);
  });
});
