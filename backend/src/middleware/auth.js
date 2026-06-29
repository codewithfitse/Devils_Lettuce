import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';
import { asyncHandler } from './asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }

  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwt.secret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(decoded.id);
    if (user?.isActive) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

export const authenticateTelegram = asyncHandler(async (req, res, next) => {
  const telegramId = req.headers['x-telegram-id'] || req.body.telegramId;
  if (!telegramId) {
    throw new AppError('Telegram ID required', 401);
  }

  const user = await User.findOne({ telegramId: String(telegramId) });
  if (!user || !user.isActive) {
    throw new AppError('Telegram user not registered', 401);
  }

  req.user = user;
  next();
});

export function signToken(userId) {
  return jwt.sign({ id: userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}
