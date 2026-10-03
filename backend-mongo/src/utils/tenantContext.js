// Per-request tenant (client / school) context, carried through async calls with AsyncLocalStorage.
//
// - No store           -> UNSCOPED (login, seeds, migrations, background scripts).
// - Store with clientId -> every query/aggregate/save on a tenant-aware model is confined to that client
//                          (see plugins/tenant.plugin.js).
import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

// `async () => await fn()` matters: Mongoose queries are lazy thenables, so they must be awaited INSIDE the
// scope (returning a bare Query would execute it after the scope has been left).
export const runWithTenant = (clientId, fn) =>
  storage.run({ clientId: String(clientId) }, async () => await fn());

/** Express-style: run `next` inside the tenant scope for the rest of the request. */
export const enterTenant = (clientId, next) => storage.run({ clientId: String(clientId) }, next);

/** Current client id (string) or null when running unscoped. */
export const getTenantId = () => storage.getStore()?.clientId ?? null;
