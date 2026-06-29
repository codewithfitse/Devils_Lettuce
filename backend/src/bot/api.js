import env from '../config/env.js';

const API_BASE = `http://localhost:${env.port}/api`;

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data.data;
}

export async function authTelegram(telegramId, name, language) {
  return apiRequest('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ telegramId: String(telegramId), name, language }),
  });
}

export async function getProducts() {
  return apiRequest('/products');
}

export async function createOrders(token, orderData) {
  return apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(orderData),
  });
}

export async function getOrders(token) {
  return apiRequest('/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getDeliveryZones() {
  return apiRequest('/delivery/zones');
}

export async function uploadPayment(token, orderIds, proofUrl, telebirrReference) {
  return apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderIds, proof: proofUrl, telebirrReference }),
  });
}

export async function getFileUrl(ctx, fileId) {
  const file = await ctx.telegram.getFile(fileId);
  return `https://api.telegram.org/file/bot${env.telegram.botToken}/${file.file_path}`;
}
