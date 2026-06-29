import * as authService from '../services/authService.js';

export async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
}

export async function telegramAuth(req, res) {
  const result = await authService.registerOrLoginTelegram(req.body);
  res.json({ success: true, data: result });
}

export async function getMe(req, res) {
  const user = await authService.getMe(req.user._id);
  res.json({ success: true, data: user });
}
