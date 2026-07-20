/** Tracks which orders are awaiting SMS payment per Telegram chat (survives until bot restart). */
const pendingByTelegramId = new Map();

export function markAwaitingPaymentSms(telegramId, orderId) {
  const key = String(telegramId);
  const ids = pendingByTelegramId.get(key) || [];
  const id = String(orderId);
  if (!ids.includes(id)) ids.push(id);
  pendingByTelegramId.set(key, ids);
}

export function peekAwaitingPaymentOrders(telegramId) {
  return pendingByTelegramId.get(String(telegramId)) || null;
}

export function clearAwaitingPaymentOrders(telegramId) {
  pendingByTelegramId.delete(String(telegramId));
}
