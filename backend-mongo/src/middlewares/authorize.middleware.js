// src/middlewares/authorize.middleware.js
// Role-based and permission-based access control. Call after authenticate.
import AppError from '../utils/AppError.js';
import userRepository from '../repositories/userRepository.js';

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  return next();
};

export const requirePermission = (permission) => async (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  // ADMIN and ORG_ADMIN bypass granular staff checks
  if (req.user.role === 'ADMIN' || req.user.role === 'ORG_ADMIN') {
    return next();
  }

  let perms = req.user.permissions;
  if (!Array.isArray(perms) || !perms.includes(permission)) {
    try {
      const user = await userRepository.findById(req.user.id || req.user._id);
      if (user && Array.isArray(user.permissions)) {
        perms = user.permissions;
      }
    } catch {
      // fallback to token permissions
    }
  }

  if (Array.isArray(perms) && perms.includes(permission)) {
    return next();
  }

  return next(new AppError(`You do not have permission (${permission}) to perform this action`, 403));
};

export default authorize;
