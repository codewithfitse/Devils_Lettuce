import { ROLES } from '../models/User.js';
import { AppError } from './errorHandler.js';

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

export const requireSuperAdmin = requireRole(ROLES.SUPER_ADMIN);

/** @deprecated Use requireSuperAdmin — sub-admins are not system admins */
export const requireAdmin = requireRole(ROLES.SUPER_ADMIN);

export function requireOwnership(getOwnerId) {
  return async (req, res, next) => {
    try {
      if (req.user.isSuperAdmin()) return next();

      const ownerId = await getOwnerId(req);
      if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('You do not own this resource', 403));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (req.user.isSuperAdmin()) return next();

    if (permission === 'canSell' && req.user.canManageProducts()) return next();
    if (permission === 'canDeliver' && req.user.canDeliverOrders()) return next();

    return next(new AppError('Insufficient permissions', 403));
  };
}

export function requireDeliveryAccess() {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (
      req.user.isSuperAdmin() ||
      req.user.canDeliverOrders() ||
      req.user.canManageProducts()
    ) {
      return next();
    }
    return next(new AppError('Insufficient permissions', 403));
  };
}
