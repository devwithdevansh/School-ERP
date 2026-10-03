// src/middlewares/auth.middleware.js
// Verifies JWT, attaches the decoded payload to req.user and confines the rest of the request
// to the caller's tenant (client / school) — see utils/tenantContext.js.
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import { enterTenant } from '../utils/tenantContext.js';
import { ORG_ADMIN_ROLE } from '../constants/modules.js';

/** Returns the verified JWT payload, null when there is no bearer token; throws AppError when invalid. */
export const readToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};

// Routes an ORG_ADMIN (platform owner, no school) may call.
const ORG_ADMIN_PATHS = ['/api/v1/auth/', '/api/v1/organization'];

const authenticate = (req, res, next) => {
  let payload;
  try {
    payload = readToken(req);
  } catch (err) {
    return next(err);
  }
  if (!payload) return next(new AppError('Missing or malformed Authorization header', 401));

  req.user = payload; // { id, role, clientId }
  // Some controllers read req.user._id (Mongoose-doc convention) instead of
  // req.user.id (JWT-payload convention) — keep both populated so
  // teacher-scoped authorization (AllocationGuardService etc.) doesn't
  // silently receive `undefined` and skip its ownership checks.
  req.user._id = payload.id;

  if (payload.role === ORG_ADMIN_ROLE) {
    // Organization admins manage clients, never a school's own data.
    if (!ORG_ADMIN_PATHS.some((p) => req.originalUrl.startsWith(p))) {
      return next(new AppError('Organization admins cannot access school data', 403));
    }
    return next();
  }

  // Tokens minted before multi-tenancy carry no clientId: force a fresh login.
  if (!payload.clientId) return next(new AppError('Session expired, please sign in again', 401));
  return enterTenant(payload.clientId, next);
};

export default authenticate;
