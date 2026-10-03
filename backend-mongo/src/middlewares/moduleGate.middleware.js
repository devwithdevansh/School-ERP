// Blocks requests from suspended clients and from modules the organization has not enabled for them.
//   app.use('/api/v1/payments', moduleGate('FEES'), paymentRoutes)   // needs the FEES module
//   app.use('/api/v1/students', moduleGate(),       studentRoutes)   // core: only requires an active client
//
// Runs BEFORE the route's own `authenticate`, so it reads the token itself. Requests without a token pass
// through untouched (public/webhook endpoints, and authenticate() will 401 the rest).
import Client from '../models/Client.js';
import AppError from '../utils/AppError.js';
import { MODULE_CATALOG, ORG_ADMIN_ROLE } from '../constants/modules.js';
import { readToken } from './auth.middleware.js';

const TTL_MS = 10_000; // module toggles take effect within ~10s
const cache = new Map();

export const invalidateClientCache = (clientId) => cache.delete(String(clientId));

export async function loadClient(clientId) {
  const key = String(clientId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.client;
  const client = await Client.findById(key).lean();
  cache.set(key, { client, at: Date.now() });
  return client;
}

const moduleGate = (moduleId) => async (req, _res, next) => {
  try {
    const payload = readToken(req);
    if (!payload || payload.role === ORG_ADMIN_ROLE) return next();
    if (!payload.clientId) return next(new AppError('Session expired, please sign in again', 401));

    const client = await loadClient(payload.clientId);
    if (!client) return next(new AppError('Your school account no longer exists', 403));
    if (client.status !== 'ACTIVE') return next(new AppError('This school account is suspended. Contact your provider.', 403));
    if (moduleId && !client.enabledModules.includes(moduleId)) {
      const label = MODULE_CATALOG.find((m) => m.id === moduleId)?.label || moduleId;
      return next(new AppError(`The ${label} module is not enabled for your organization`, 403));
    }
    req.client = client;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default moduleGate;
