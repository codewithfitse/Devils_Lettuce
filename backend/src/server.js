import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import { expireStalePayments } from './services/paymentService.js';
import { startBot, stopBot } from './bot/index.js';
import { startKeepAlive } from './keepAlive.js';

async function bootstrap() {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
  });

  if (env.telegram.botToken && env.telegram.enabled) {
    console.log('Starting Telegram bot...');
    startBot();
    if (env.telegram.usingLocalToken) {
      console.log('Telegram bot using TELEGRAM_BOT_TOKEN_LOCAL (dev test bot)');
    }
  } else if (env.telegram.botToken) {
    const hint =
      process.env.ENABLE_TELEGRAM_BOT === 'false'
        ? 'ENABLE_TELEGRAM_BOT=false'
        : 'set ENABLE_TELEGRAM_BOT=true or TELEGRAM_BOT_TOKEN_LOCAL for local testing';
    console.log(`Telegram bot skipped (${hint}). API still runs.`);
  }

  startKeepAlive();

  setInterval(async () => {
    try {
      const count = await expireStalePayments();
      if (count > 0) console.log(`Expired ${count} stale payment(s)`);
    } catch (error) {
      console.error('Payment expiry job failed:', error.message);
    }
  }, 60 * 60 * 1000);

  const shutdown = async () => {
    console.log('Shutting down...');
    await stopBot().catch(() => {});
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
