import User, { ROLES } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeUser } from './authService.js';

export async function getUsers(filters = {}, requester) {
  const query = {};
  if (filters.role) query.role = filters.role;
  if (!requester.isSuperAdmin()) {
    throw new AppError('Only super admin can list all users', 403);
  }
  const users = await User.find(query).sort({ createdAt: -1 });
  return users.map(sanitizeUser);
}

export async function getUserById(id, requester) {
  if (!requester.isSuperAdmin() && requester._id.toString() !== id) {
    throw new AppError('Access denied', 403);
  }
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
}

export async function updateUser(id, data, requester) {
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);

  const isSelf = requester._id.toString() === id;
  const isSuperAdmin = requester.isSuperAdmin();

  if (!isSelf && !isSuperAdmin) {
    throw new AppError('Access denied', 403);
  }

  const allowedSelf = ['name', 'phone', 'language'];
  const allowedAdmin = ['name', 'phone', 'role', 'permissions', 'isActive', 'language'];

  const fields = isSuperAdmin ? allowedAdmin : allowedSelf;
  for (const key of fields) {
    if (data[key] !== undefined) user[key] = data[key];
  }

  if (data.role && !isSuperAdmin) {
    throw new AppError('Cannot change role', 403);
  }

  if (data.isActive === false && user.role === ROLES.SUPER_ADMIN) {
    throw new AppError('Cannot ban super admin', 400);
  }

  if (data.isActive === false && isSelf) {
    throw new AppError('You cannot ban yourself', 400);
  }

  if (requester.isSubAdmin() && !isSelf) {
    throw new AppError('Sub admin cannot modify other users', 403);
  }

  await user.save();
  return sanitizeUser(user);
}

export async function deleteUser(id, requester) {
  if (!requester.isSuperAdmin()) {
    throw new AppError('Only super admin can delete users', 403);
  }
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new AppError('Cannot delete super admin', 400);
  }
  user.isActive = false;
  await user.save();
  return { message: 'User deactivated' };
}

export async function getMerchants() {
  return User.find({
    isActive: true,
    $or: [
      { role: ROLES.MERCHANT },
      { role: ROLES.SUB_ADMIN },
      { 'permissions.canSell': true },
    ],
  }).select('name phone role');
}

export async function getDrivers() {
  return User.find({
    isActive: true,
    $or: [
      { role: ROLES.DRIVER },
      { role: ROLES.SUB_ADMIN },
      { 'permissions.canDeliver': true },
    ],
  }).select('name phone role');
}
