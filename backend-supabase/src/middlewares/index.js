import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { AppError } from '../utils/http.js';
import { enterTenant } from '../utils/tenantContext.js';
import { MODULE_CATALOG, ORG_ADMIN_ROLE } from '../constants/modules.js';
import { loadClient } from '../services/clients.js';

/** Verified JWT payload, null when there is no bearer token; throws AppError when invalid. */
export const readToken = (req) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};

// Routes an ORG_ADMIN (platform owner, no school) may call.
const ORG_ADMIN_PATHS = ['/api/v1/auth/', '/api/v1/organization'];

/** Verifies the JWT and confines the rest of the request to the caller's tenant (client / school). */
export const authenticate = (req, _res, next) => {
  let payload;
  try {
    payload = readToken(req);
  } catch (err) {
    return next(err);
  }
  if (!payload) return next(new AppError('Missing or malformed Authorization header', 401));
  req.user = { ...payload, _id: payload.id };

  if (payload.role === ORG_ADMIN_ROLE) {
    if (!ORG_ADMIN_PATHS.some((p) => req.originalUrl.startsWith(p))) {
      return next(new AppError('Organization admins cannot access school data', 403));
    }
    return next();
  }
  // Tokens minted before multi-tenancy carry no clientId: force a fresh login.
  if (!payload.clientId) return next(new AppError('Session expired, please sign in again', 401));
  return enterTenant(payload.clientId, next);
};

/**
 * Rejects suspended clients and clients that lack module `moduleId`. No id = core route (active client only).
 * Runs before the route's own `authenticate`; requests without a token pass through (authenticate 401s them).
 */
export const moduleGate = (moduleId) => async (req, _res, next) => {
  try {
    const payload = readToken(req);
    if (!payload || payload.role === ORG_ADMIN_ROLE) return next();
    if (!payload.clientId) return next(new AppError('Session expired, please sign in again', 401));
    const client = await loadClient(payload.clientId);
    if (!client) return next(new AppError('Your school account no longer exists', 403));
    if (client.status !== 'ACTIVE') return next(new AppError('This school account is suspended. Contact your provider.', 403));
    if (moduleId && !client.enabled_modules.includes(moduleId)) {
      const label = MODULE_CATALOG.find((m) => m.id === moduleId)?.label || moduleId;
      return next(new AppError(`The ${label} module is not enabled for your organization`, 403));
    }
    req.client = client;
    return next();
  } catch (err) {
    return next(err);
  }
};

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (!roles.includes(req.user.role)) return next(new AppError('You do not have permission to perform this action', 403));
  next();
};

/** ERP feature flag: if SUPER_ADMIN_EMAILS is set only those users pass; otherwise any ADMIN. */
export const requireSuperAdmin = async (req, _res, next) => {
  try {
    if (!env.SUPER_ADMIN_EMAILS.length) return next();
    const { default: supabase } = await import('../config/supabase.js');
    const { data } = await supabase.from('users').select('email').eq('id', req.user.id).maybeSingle();
    if (!data || !env.SUPER_ADMIN_EMAILS.includes(String(data.email || '').toLowerCase())) {
      return next(new AppError('Forbidden. This feature is currently in restricted preview.', 403));
    }
    next();
  } catch (e) { next(e); }
};

/** Validates req.body / req.query with a zod schema, replacing them with parsed values. */
export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) req.body = schema.body.parse(req.body);
    if (schema.query) {
      Object.defineProperty(req, 'query', { value: schema.query.parse(req.query), writable: true, enumerable: true, configurable: true });
    }
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation Error', errors: error.issues ?? error.errors });
  }
};

export const notImplemented = (feature) => (_req, _res, next) =>
  next(new AppError(`${feature} is not implemented in backend-supabase yet.`, 501));

export const globalErrorHandler = (err, _req, res, _next) => {
  const status = err.statusCode || 500;
  if (status >= 500) console.error('[error]', err.message, err.cause || err.stack);
  res.status(status).json({
    success: false,
    status: status >= 500 ? 'error' : 'fail',
    message: err.isOperational ? err.message : 'Something went very wrong!',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
