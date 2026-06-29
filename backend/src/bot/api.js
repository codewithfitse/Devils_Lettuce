import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import * as authService from '../services/authService.js';
import * as productService from '../services/productService.js';
import * as orderService from '../services/orderService.js';
import * as deliveryService from '../services/deliveryService.js';
import * as paymentService from '../services/paymentService.js';

async function getUserFromToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwt.secret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user?.isActive) {
    throw new AppError('User not found or inactive', 401);
  }
  return user;
}

export async function authTelegram(telegramId, name, language) {
  return authService.registerOrLoginTelegram({
    telegramId: String(telegramId),
    name,
    language,
  });
}

export async function getProducts() {
  return productService.getProducts({ approvedOnly: true });
}

export async function createOrders(token, orderData) {
  const user = await getUserFromToken(token);
  return orderService.createOrders(orderData, user);
}

export async function getOrders(token) {
  const user = await getUserFromToken(token);
  return orderService.getOrders({}, user);
}

export async function getDeliveryZones() {
  return deliveryService.getDeliveryZones();
}

export async function uploadPayment(token, orderIds, proofUrl, telebirrReference) {
  const user = await getUserFromToken(token);
  return paymentService.createPayment({ orderIds, telebirrReference }, user, proofUrl);
}

export async function getFileUrl(ctx, fileId) {
  const file = await ctx.telegram.getFile(fileId);
  return `https://api.telegram.org/file/bot${env.telegram.botToken}/${file.file_path}`;
}
