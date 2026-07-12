import User from '../models/User.js';

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 1000;

export async function getBotSubscriberChatIds() {
  const users = await User.find({
    isActive: true,
    telegramId: { $exists: true, $ne: null },
  }).select('telegramId');

  return [...new Set(users.map((u) => String(u.telegramId)))];
}

export async function sendInBatches(chatIds, sendOne) {
  let sent = 0;
  let failed = 0;
  const unique = [...new Set(chatIds.filter(Boolean).map(String))];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (chatId) => {
        try {
          const ok = await sendOne(chatId);
          return ok !== false;
        } catch {
          return false;
        }
      })
    );
    sent += results.filter(Boolean).length;
    failed += results.filter((ok) => !ok).length;

    if (i + BATCH_SIZE < unique.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return { total: unique.length, sent, failed };
}
