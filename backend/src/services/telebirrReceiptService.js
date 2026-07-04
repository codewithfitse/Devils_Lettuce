import axios from 'axios';
import * as cheerio from 'cheerio';
import env from '../config/env.js';

const FETCH_TIMEOUT_MS = parseInt(process.env.TELEBIRR_RECEIPT_FETCH_TIMEOUT_MS, 10) || 45000;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 5000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function formatFetchError(message) {
  const text = String(message || 'Failed to fetch receipt');
  if (/timeout|ETIMEDOUT|ECONNABORTED/i.test(text)) {
    return (
      'Ethio Telecom receipt site timed out. The site is often slow from overseas servers (e.g. Render). ' +
      'Payment stays pending for manual review — you can verify the receipt link yourself.'
    );
  }
  if (/ENOTFOUND|ECONNREFUSED|ENETUNREACH/i.test(text)) {
    return 'Could not reach Ethio Telecom receipt site. Payment stays pending for manual review.';
  }
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAmount(value) {
  if (value == null) return null;
  const match = String(value).replace(/,/g, '').match(/([\d]+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findByLabel(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(
      `${label}\\s*[:\\-]?\\s*([^\\n\\r<]+)`,
      'i'
    );
    const match = text.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return null;
}

/**
 * Parse official Telebirr receipt HTML into structured fields.
 */
export function parseReceiptHtml(html, transactionId) {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  const fields = {};

  const nameBlockMatch = bodyText.match(
    /Credited Party name\s+(.+?)\s*\/?\s*Credited party account no/i
  );
  if (nameBlockMatch) {
    const westernName = nameBlockMatch[1].match(
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/
    );
    if (westernName) fields.creditedPartyName = cleanText(westernName[1]);
  }

  const accountMatch = bodyText.match(
    /Credited party account no\s+([0-9*]+)/i
  );
  if (accountMatch) fields.creditedPartyAccount = cleanText(accountMatch[1]);

  const statusMatch = bodyText.match(/transaction status\s+(\w+)/i);
  if (statusMatch) fields.transactionStatus = cleanText(statusMatch[1]);

  const invoiceRowMatch = bodyText.match(
    /\b([A-Z][A-Z0-9]{9,11})\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}\s+([\d.]+)\s*Birr/i
  );
  if (invoiceRowMatch) {
    fields.invoiceNo = invoiceRowMatch[1].toUpperCase();
    fields.settledAmount = parseAmount(invoiceRowMatch[2]);
  }

  if (!fields.invoiceNo && transactionId) {
    fields.invoiceNo = transactionId.toUpperCase();
  }

  fields.creditedPartyName =
    fields.creditedPartyName ||
    (() => {
      const raw = findByLabel(bodyText, ['Credited Party name', 'Credited party name']);
      if (!raw) return null;
      const western = raw.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
      return western ? cleanText(western[1]) : null;
    })();
  fields.creditedPartyAccount =
    fields.creditedPartyAccount ||
    findByLabel(bodyText, ['Credited party account no', 'Credited Party account no']);
  fields.transactionStatus =
    fields.transactionStatus || findByLabel(bodyText, ['Transaction status', 'transaction status']);

  const settledRaw = findByLabel(bodyText, ['Settled Amount']);
  if (fields.settledAmount == null && settledRaw) {
    fields.settledAmount = parseAmount(settledRaw);
  }

  return {
    creditedPartyName: fields.creditedPartyName || null,
    creditedPartyAccount: fields.creditedPartyAccount || null,
    transactionStatus: fields.transactionStatus || null,
    settledAmount: fields.settledAmount ?? null,
    invoiceNo: fields.invoiceNo || null,
    debugSnippet: bodyText.slice(0, 2000),
  };
}

export function buildReceiptUrl(transactionId) {
  const base = env.telebirrReceiptBaseUrl.replace(/\/$/, '');
  return `${base}/${encodeURIComponent(transactionId)}`;
}

export async function fetchOfficialReceipt(transactionId) {
  const receiptUrl = buildReceiptUrl(transactionId);
  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const response = await axios.get(receiptUrl, {
        timeout: FETCH_TIMEOUT_MS,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
        validateStatus: (status) => status < 500,
      });

      if (response.status === 404) {
        return {
          ok: false,
          receiptUrl,
          transactionId,
          fetchError: 'Receipt not found (404)',
          httpStatus: 404,
        };
      }

      if (response.status !== 200 || !response.data) {
        lastError = `HTTP ${response.status}`;
        if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
        continue;
      }

      const parsed = parseReceiptHtml(String(response.data), transactionId);
      const hasData =
        parsed.creditedPartyName ||
        parsed.creditedPartyAccount ||
        parsed.transactionStatus ||
        parsed.settledAmount != null;

      if (!hasData) {
        return {
          ok: false,
          receiptUrl,
          transactionId,
          fetchError: 'Receipt page loaded but could not parse fields',
          httpStatus: response.status,
          parsed,
        };
      }

      return {
        ok: true,
        receiptUrl,
        transactionId,
        httpStatus: response.status,
        fetchedAt: new Date(),
        ...parsed,
      };
    } catch (error) {
      lastError = error.message || 'Network error';
      if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
    }
  }

  return {
    ok: false,
    receiptUrl,
    transactionId,
    fetchError: formatFetchError(lastError),
  };
}
