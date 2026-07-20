import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set`);
  }
}

function parseCorsOrigins() {
  const origins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', "https://devils-lettuce.vercel.app"]);

  if (process.env.FRONTEND_URL) {
    origins.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  if (process.env.CORS_ORIGINS) {
    process.env.CORS_ORIGINS.split(',').forEach((o) => {
      const trimmed = o.trim().replace(/\/$/, '');
      if (trimmed) origins.add(trimmed);
    });
  }

  // Vercel previews + Cursor/VS Code Dev Tunnels + ngrok (local backend exposed to internet)
  const list = [
    ...origins,
    /^https:\/\/[\w-]+\.vercel\.app$/,
    /^https:\/\/.*\.devtunnels\.ms$/,
    /^https:\/\/[\w-]+\.ngrok-free\.app$/,
    /^https:\/\/[\w-]+\.ngrok\.io$/,
  ];
  return list;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT, 10) || 5000;
const isProduction = nodeEnv === 'production';

function resolveBotToken() {
  if (!isProduction && process.env.TELEGRAM_BOT_TOKEN_LOCAL) {
    return process.env.TELEGRAM_BOT_TOKEN_LOCAL;
  }
  return process.env.TELEGRAM_BOT_TOKEN;
}

function resolveTelegramEnabled() {
  if (process.env.ENABLE_TELEGRAM_BOT === 'false') return false;
  if (process.env.ENABLE_TELEGRAM_BOT === 'true') return true;
  // Dev-only test bot from @BotFather — avoids 409 with Render production bot
  if (!isProduction && process.env.TELEGRAM_BOT_TOKEN_LOCAL) return true;
  // Production (Render): bot on by default
  if (isProduction) return true;
  // Local dev: off by default — Render handles Telegram
  return false;
}

export default {
  nodeEnv,
  port,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/devils_lettuce',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  telegram: {
    botToken: resolveBotToken(),
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
    enabled: resolveTelegramEnabled(),
    usingLocalToken: !isProduction && Boolean(process.env.TELEGRAM_BOT_TOKEN_LOCAL),
  },
  botApiUrl: process.env.BOT_API_URL || `http://127.0.0.1:${port}/api`,
  corsOrigins: parseCorsOrigins(),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL,
  renderUrl: process.env.RENDER_EXTERNAL_URL,
  telebirrAccount: process.env.TELEBIRR_ACCOUNT || '0982863015',
  telebirrRecipientName: process.env.TELEBIRR_RECIPIENT_NAME || 'Fitsum Zerihun Tadesse',
  telebirrReceiptBaseUrl:
    process.env.TELEBIRR_RECEIPT_BASE_URL || 'https://transactioninfo.ethiotelecom.et/receipt',
  telebirrReceiptFetchTimeoutMs:
    parseInt(process.env.TELEBIRR_RECEIPT_FETCH_TIMEOUT_MS, 10) || 45000,
  telebirrReceiptProxyUrl: process.env.TELEBIRR_RECEIPT_PROXY_URL || '',
  veritasApiUrl: process.env.VERITAS_API_URL || 'https://verifyapi.leulzenebe.pro',
  veritasApiKey: process.env.VERITAS_API_KEY || '',
  veritasEnabled: Boolean(process.env.VERITAS_API_KEY) && process.env.VERITAS_ENABLED !== 'false',
  paymentVerifyEnabled: process.env.PAYMENT_VERIFY_ENABLED !== 'false',
  paymentAutoApproveEnabled: process.env.PAYMENT_AUTO_APPROVE_ENABLED !== 'false',
  paymentAutoApproveMinConfidence:
    parseInt(process.env.PAYMENT_AUTO_APPROVE_MIN_CONFIDENCE, 10) || 90,
  paymentAutoReleaseEnabled: process.env.PAYMENT_AUTO_RELEASE_ENABLED !== 'false',
  tesseractLang: process.env.TESSERACT_LANG || 'eng',
};
