// Per-request tenant (client / school) context via AsyncLocalStorage.
//  - no store            -> UNSCOPED (login, seed, organization console)
//  - store with clientId -> config/supabase.js confines every query to that client
import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

export const runWithTenant = (clientId, fn) => storage.run({ clientId: String(clientId) }, async () => await fn());

/** Express-style: run `next` inside the tenant scope for the rest of the request. */
export const enterTenant = (clientId, next) => storage.run({ clientId: String(clientId) }, next);

export const getTenantId = () => storage.getStore()?.clientId ?? null;
