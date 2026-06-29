import axios from 'axios';
import env from './config/env.js';

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/** Resolve ping URL — accepts base URL, /api, or full /api/health */
export function resolvePingUrl(url) {
  if (!url) return null;
  const trimmed = url.replace(/\/$/, '');
  if (trimmed.endsWith('/health')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/health`;
  return `${trimmed}/api/health`;
}

export function startKeepAlive() {
  const backendUrl =
    resolvePingUrl(env.backendUrl) ||
    resolvePingUrl(env.renderUrl);

  if (!backendUrl) return;

  const ping = async () => {
    try {
      const res = await axios.get(backendUrl, { timeout: 30000 });
      console.log(`[PING] ${new Date().toISOString()} - Status: ${res.status}`);
    } catch (error) {
      console.error(
        `[PING ERROR] ${new Date().toISOString()} - ${error.message}`
      );
    }
  };

  ping();
  setInterval(ping, PING_INTERVAL_MS);
  console.log(`[PING] Keep-alive enabled → ${backendUrl}`);
}
