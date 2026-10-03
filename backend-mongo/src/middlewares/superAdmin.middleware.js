import AppError from '../utils/AppError.js';
import env from '../config/env.js';

/**
 * Feature-flag middleware for the ERP module.
 * If SUPER_ADMIN_EMAILS is set, only those emails may access ERP routes.
 * If empty, any authenticated ADMIN passes (role check happens upstream).
 * Future: replace with module/role permission checks.
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  if (env.SUPER_ADMIN_EMAILS.length && !env.SUPER_ADMIN_EMAILS.includes(String(req.user.email || '').toLowerCase())) {
    return next(new AppError('Forbidden. This feature is currently in restricted preview.', 403));
  }

  next();
};
