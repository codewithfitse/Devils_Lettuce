import axios from 'axios';
import * as cheerio from 'cheerio';
import env from '../config/env.js';

const FETCH_TIMEOUT_MS = env.telebirrReceiptFetchTimeoutMs || 45000;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 5000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function formatFetchError(message) {
  const text = String(message || 'Failed to fetch receipt');
  if (/timeout|ETIMEDOUT|ECONNABORTED/i.test(text)) {
    return (
      'Ethio Telecom receipt site timed out from this server. Upload the official PDF from the receipt page ' +
      '(Download PDF button) as a fallback, or verify the link manually.'
    );
  }
  if (/ENOTFOUND|ECONNREFUSED|ENETUNREACH/i.test(text)) {
    return 'Could not reach Ethio Telecom receipt site. Upload the official PDF or verify manually.';
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

function labelIncludes(label, needles) {
  const normalized = String(label || '').toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function parseTableFields($) {
  const fields = {};

  $('table tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .map((__, cell) => cleanText($(cell).text()))
      .get()
      .filter(Boolean);

    if (cells.length === 2) {
      const [label, value] = cells;
      if (labelIncludes(label, ['credited party name'])) {
        fields.creditedPartyName = value;
      } else if (labelIncludes(label, ['credited party account'])) {
        fields.creditedPartyAccount = value;
      } else if (labelIncludes(label, ['transaction status'])) {
        fields.transactionStatus = value;
      }
    }

    if (cells.length === 3) {
      const [first, , third] = cells;
      if (labelIncludes(first, ['invoice no']) && labelIncludes(cells[1], ['payment date'])) {
        return;
      }
      const idMatch = first?.match(/^[A-Z][A-Z0-9]{9,11}$/);
      const amountMatch = third?.match(/^([\d.]+)\s*Birr?$/i);
      if (idMatch && amountMatch) {
        fields.invoiceNo = idMatch[0];
        fields.settledAmount = parseAmount(amountMatch[1]);
      }
    }
  });

  return fields;
}

/**
 * Parse receipt fields from flattened text (HTML body or PDF text).
 */
export function parseReceiptText(bodyText, transactionId) {
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

/**
 * Parse official Telebirr receipt HTML into structured fields.
 */
export function parseReceiptHtml(html, transactionId) {
  const $ = cheerio.load(html);
  const tableFields = parseTableFields($);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const textFields = parseReceiptText(bodyText, transactionId);

  return {
    creditedPartyName: tableFields.creditedPartyName || textFields.creditedPartyName,
    creditedPartyAccount: tableFields.creditedPartyAccount || textFields.creditedPartyAccount,
    transactionStatus: tableFields.transactionStatus || textFields.transactionStatus,
    settledAmount: tableFields.settledAmount ?? textFields.settledAmount,
    invoiceNo: tableFields.invoiceNo || textFields.invoiceNo,
    debugSnippet: textFields.debugSnippet,
  };
}

export async function parseReceiptPdf(buffer, transactionId) {
  const pdfParse = (await import('pdf-parse')).default;
  const { text } = await pdfParse(buffer);
  return parseReceiptText(String(text || '').replace(/\s+/g, ' ').trim(), transactionId);
}

function hasParsedData(parsed) {
  return Boolean(
    parsed?.creditedPartyName ||
      parsed?.creditedPartyAccount ||
      parsed?.transactionStatus ||
      parsed?.settledAmount != null
  );
}

function buildAxiosConfig() {
  const config = {
    timeout: FETCH_TIMEOUT_MS,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    validateStatus: (status) => status < 500,
    maxRedirects: 5,
  };

  if (env.telebirrReceiptProxyUrl) {
    try {
      const proxyUrl = new URL(env.telebirrReceiptProxyUrl);
      config.proxy = {
        protocol: proxyUrl.protocol.replace(':', ''),
        host: proxyUrl.hostname,
        port: Number(proxyUrl.port) || (proxyUrl.protocol === 'https:' ? 443 : 80),
        auth:
          proxyUrl.username || proxyUrl.password
            ? {
                username: decodeURIComponent(proxyUrl.username),
                password: decodeURIComponent(proxyUrl.password),
              }
            : undefined,
      };
    } catch {
      console.warn('Invalid TELEBIRR_RECEIPT_PROXY_URL — ignoring');
    }
  }

  return config;
}

export function buildReceiptUrl(transactionId) {
  const base = env.telebirrReceiptBaseUrl.replace(/\/$/, '');
  return `${base}/${encodeURIComponent(transactionId)}`;
}

async function fetchReceiptHtml(receiptUrl) {
  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const response = await axios.get(receiptUrl, buildAxiosConfig());

      if (response.status === 404) {
        return { ok: false, httpStatus: 404, error: 'Receipt not found (404)' };
      }

      if (response.status !== 200 || !response.data) {
        lastError = `HTTP ${response.status}`;
        if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
        continue;
      }

      return { ok: true, html: String(response.data), httpStatus: response.status };
    } catch (error) {
      lastError = error.message || 'Network error';
      if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
    }
  }

  return { ok: false, error: formatFetchError(lastError) };
}

async function downloadPdfBuffer(pdfUrl) {
  const baseConfig = buildAxiosConfig();
  const response = await axios.get(pdfUrl, {
    ...baseConfig,
    responseType: 'arraybuffer',
    headers: {
      ...baseConfig.headers,
      Accept: 'application/pdf,*/*',
    },
  });
  if (response.status !== 200 || !response.data) {
    throw new Error(`Could not download receipt PDF (HTTP ${response.status})`);
  }
  return Buffer.from(response.data);
}

function buildSuccessResult({ receiptUrl, transactionId, parsed, source, httpStatus }) {
  return {
    ok: true,
    receiptUrl,
    transactionId,
    httpStatus: httpStatus || null,
    fetchedAt: new Date(),
    source,
    ...parsed,
  };
}

function buildFailureResult({ receiptUrl, transactionId, fetchError, parsed, httpStatus }) {
  return {
    ok: false,
    receiptUrl,
    transactionId,
    fetchError,
    httpStatus: httpStatus || null,
    ...(parsed || {}),
  };
}

/**
 * Map a successful Veritas Telebirr response body into the parsed-field shape
 * returned by parseReceiptHtml. Written against the real response body:
 *   { success: true, data: { creditedPartyName, creditedPartyAccountNo,
 *     transactionStatus, receiptNo, settledAmount, ... } }
 */
function parseVeritasReceipt(body, transactionId) {
  const data = body?.data || {};
  return {
    creditedPartyName: cleanText(data.creditedPartyName) || null,
    creditedPartyAccount: cleanText(data.creditedPartyAccountNo) || null,
    // Veritas already returns e.g. "Completed"; checkTransactionStatus matches on "completed".
    transactionStatus: cleanText(data.transactionStatus) || null,
    settledAmount: parseAmount(data.settledAmount),
    invoiceNo: cleanText(data.receiptNo) || (transactionId ? transactionId.toUpperCase() : null),
    // Keep the raw provider result for troubleshooting.
    veritasRaw: body,
  };
}

/**
 * Look up a Telebirr receipt through the Veritas in-country relay.
 * Returns a success result on a verified receipt, or null so the caller can
 * fall back to the Ethio Telecom scrape / PDF upload.
 */
export async function fetchReceiptFromVeritas(transactionId) {
  if (!env.veritasApiKey) return null;

  const verifyUrl = `${env.veritasApiUrl.replace(/\/$/, '')}/verify`;
  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const response = await axios.post(
        verifyUrl,
        { reference: transactionId },
        {
          timeout: FETCH_TIMEOUT_MS,
          headers: {
            'x-api-key': env.veritasApiKey,
            'content-type': 'application/json',
            Accept: 'application/json',
          },
          validateStatus: (status) => status < 500,
        }
      );

      const body = response.data;
      // Inspect BOTH the HTTP status and the JSON body: some adapters signal a
      // provider failure with HTTP 200, so trust body.success for success.
      const verified =
        response.status >= 200 &&
        response.status < 300 &&
        body?.success === true &&
        body?.data;

      if (!verified) {
        lastError = body?.error || `HTTP ${response.status}`;
        // 4xx (bad/unknown reference) is definitive — don't retry, fall back.
        if (response.status >= 400 && response.status < 500) {
          console.warn(`Veritas could not verify ${transactionId}: ${lastError}`);
          return null;
        }
        if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
        continue;
      }

      const parsed = parseVeritasReceipt(body, transactionId);
      if (!hasParsedData(parsed)) return null;

      return buildSuccessResult({
        receiptUrl: buildReceiptUrl(transactionId),
        transactionId,
        parsed,
        source: 'veritas',
        httpStatus: response.status,
      });
    } catch (error) {
      lastError = error.message || 'Network error';
      if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
    }
  }

  if (lastError) console.warn(`Veritas receipt lookup failed for ${transactionId}: ${lastError}`);
  return null;
}

/**
 * Fetch and parse official receipt. Prefers the in-country Veritas relay, then
 * falls back to the Ethio Telecom HTML scrape and user-uploaded PDF.
 */
export async function fetchOfficialReceipt(transactionId, { receiptPdfUrl, receiptPdfBuffer } = {}) {
  const receiptUrl = buildReceiptUrl(transactionId);

  if (env.veritasEnabled) {
    try {
      const veritasResult = await fetchReceiptFromVeritas(transactionId);
      if (veritasResult && hasParsedData(veritasResult)) {
        return veritasResult;
      }
    } catch (error) {
      console.warn(`Veritas lookup errored, falling back to Ethio Telecom: ${error.message}`);
    }
  }

  const htmlResult = await fetchReceiptHtml(receiptUrl);
  if (htmlResult.ok) {
    const parsed = parseReceiptHtml(htmlResult.html, transactionId);
    if (hasParsedData(parsed)) {
      return buildSuccessResult({
        receiptUrl,
        transactionId,
        parsed,
        source: 'html',
        httpStatus: htmlResult.httpStatus,
      });
    }
    return buildFailureResult({
      receiptUrl,
      transactionId,
      fetchError: 'Receipt page loaded but could not parse fields',
      parsed,
      httpStatus: htmlResult.httpStatus,
    });
  }

  if (htmlResult.httpStatus === 404) {
    return buildFailureResult({
      receiptUrl,
      transactionId,
      fetchError: 'Receipt not found (404)',
      httpStatus: 404,
    });
  }

  let pdfBuffer = receiptPdfBuffer || null;
  if (!pdfBuffer && receiptPdfUrl) {
    try {
      pdfBuffer = await downloadPdfBuffer(receiptPdfUrl);
    } catch (error) {
      return buildFailureResult({
        receiptUrl,
        transactionId,
        fetchError: `${htmlResult.error} PDF fallback also failed: ${error.message}`,
      });
    }
  }

  if (pdfBuffer) {
    try {
      const parsed = await parseReceiptPdf(pdfBuffer, transactionId);
      if (hasParsedData(parsed)) {
        return buildSuccessResult({
          receiptUrl,
          transactionId,
          parsed,
          source: 'pdf',
        });
      }
      return buildFailureResult({
        receiptUrl,
        transactionId,
        fetchError: 'Receipt PDF uploaded but could not parse fields',
        parsed,
      });
    } catch (error) {
      return buildFailureResult({
        receiptUrl,
        transactionId,
        fetchError: `${htmlResult.error} PDF parse failed: ${error.message}`,
      });
    }
  }

  return buildFailureResult({
    receiptUrl,
    transactionId,
    fetchError: htmlResult.error,
  });
}
