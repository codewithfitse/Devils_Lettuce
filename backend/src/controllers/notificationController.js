import { AppError } from '../middleware/errorHandler.js';
import { broadcastToAllUsers } from '../utils/notifications.js';
import { getBotSubscriberChatIds } from '../services/broadcastService.js';

export async function getSubscriberCount(_req, res) {
  const chatIds = await getBotSubscriberChatIds();
  res.json({ success: true, data: { count: chatIds.length } });
}

export async function broadcastMessage(req, res) {
  const message = req.body?.message?.trim();
  if (!message) {
    throw new AppError('Message is required', 400);
  }
  if (message.length > 4000) {
    throw new AppError('Message is too long (max 4000 characters)', 400);
  }

  const stats = await broadcastToAllUsers(message);
  res.json({ success: true, data: stats });
}
