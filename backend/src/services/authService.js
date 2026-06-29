import User, { ROLES } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/auth.js';

export async function register({ name, email, password, phone, role }) {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 409);

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || ROLES.USER,
  });

  const token = signToken(user._id);
  return { user: sanitizeUser(user), token };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const token = signToken(user._id);
  return { user: sanitizeUser(user), token };
}

export async function registerOrLoginTelegram({ telegramId, name, phone, language }) {
  let user = await User.findOne({ telegramId: String(telegramId) });

  if (!user) {
    user = await User.create({
      name: name || `User_${telegramId}`,
      telegramId: String(telegramId),
      phone,
      language: language || 'en',
      role: ROLES.USER,
    });
  } else if (language) {
    user.language = language;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    await user.save();
  }

  const token = signToken(user._id);
  return { user: sanitizeUser(user), token };
}

export function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
}
