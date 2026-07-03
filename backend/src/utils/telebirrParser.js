const AMOUNT_PATTERNS = [
  /(?:ETB|Birr|ብር)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/gi,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr|ብር)/gi,
  /(?:amount|total|paid)[:\s]*([\d,]+(?:\.\d{1,2})?)/gi,
];

const PHONE_PATTERN = /(?:\+?251|0)?9\d{8}/g;

/** Telebirr transaction / invoice IDs e.g. DG38HZNHRO */
const TRANSACTION_ID_PATTERN = /\b([A-Z][A-Z0-9]{9,11})\b/g;

const TRANSACTION_LABEL_PATTERNS = [
  /transaction\s*number[:\s]*([A-Z0-9]{10,12})/gi,
  /invoice\s*no\.?[:\s]*([A-Z0-9]{10,12})/gi,
];

const REFERENCE_PATTERNS = [
  /\b(FT[A-Z0-9]{8,})\b/gi,
  TRANSACTION_ID_PATTERN,
];

const SUCCESS_KEYWORDS = [
  'successful',
  'success',
  'completed',
  'complete',
  'paid',
  'transaction successful',
  'payment successful',
  'ተሳክቷል',
  'ተሳክቶ',
  'ተጠናቋል',
];

function parseNumber(str) {
  if (!str) return null;
  const n = parseFloat(String(str).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function normalizeTransactionId(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]{10,12}$/.test(normalized)) return null;
  return normalized;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length >= 12) {
    return `0${digits.slice(3, 12)}`;
  }
  if (digits.startsWith('9') && digits.length >= 9) {
    return `0${digits.slice(0, 9)}`;
  }
  if (digits.startsWith('09') && digits.length >= 10) {
    return digits.slice(0, 10);
  }
  return digits || null;
}

function extractTransactionIds(text) {
  const ids = new Set();

  for (const pattern of TRANSACTION_LABEL_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const id = normalizeTransactionId(match[1]);
      if (id) ids.add(id);
    }
  }

  TRANSACTION_ID_PATTERN.lastIndex = 0;
  let match;
  while ((match = TRANSACTION_ID_PATTERN.exec(text)) !== null) {
    const id = normalizeTransactionId(match[1]);
    if (id) ids.add(id);
  }

  return [...ids];
}

function extractAmounts(text) {
  const amounts = new Set();
  for (const pattern of AMOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseNumber(match[1]);
      if (value !== null && value > 0 && value < 1_000_000) {
        amounts.add(value);
      }
    }
  }
  return [...amounts];
}

function extractPhones(text) {
  const phones = new Set();
  PHONE_PATTERN.lastIndex = 0;
  let match;
  while ((match = PHONE_PATTERN.exec(text)) !== null) {
    const normalized = normalizePhone(match[0]);
    if (normalized) phones.add(normalized);
  }
  return [...phones];
}

function extractReferences(text) {
  const refs = new Set();
  for (const pattern of REFERENCE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[1].trim().toUpperCase();
      if (ref.length >= 8) refs.add(ref);
    }
  }
  return [...refs];
}

function extractSuccessText(text) {
  const lower = text.toLowerCase();
  for (const keyword of SUCCESS_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

function pickBestAmount(amounts, expectedAmount) {
  if (!amounts.length) return null;
  if (expectedAmount == null) return amounts[0];
  return amounts.reduce((best, current) =>
    Math.abs(current - expectedAmount) < Math.abs(best - expectedAmount) ? current : best
  );
}

function pickRecipient(phones, expectedAccount) {
  const normalizedExpected = normalizePhone(expectedAccount);
  if (normalizedExpected && phones.includes(normalizedExpected)) {
    return normalizedExpected;
  }
  return phones.find((p) => p === normalizedExpected) || phones[0] || null;
}

function pickReference(refs, userReference) {
  if (!refs.length) return null;
  if (!userReference) return refs[0];
  const userRef = userReference.trim().toUpperCase();
  const exact = refs.find((r) => r === userRef || r.includes(userRef) || userRef.includes(r));
  return exact || refs[0];
}

/**
 * Resolve Telebirr transaction ID: user input first, then OCR.
 */
export function resolveTransactionId(userReference, ocrText) {
  const fromUser = normalizeTransactionId(userReference);
  if (fromUser) return fromUser;

  const fromOcr = extractTransactionIds(ocrText || '');
  return fromOcr[0] || null;
}

export function parseTelebirrText(rawText, { expectedAmount, expectedAccount, userReference } = {}) {
  const text = rawText || '';
  const amounts = extractAmounts(text);
  const phones = extractPhones(text);
  const transactionIds = extractTransactionIds(text);
  const refs = extractReferences(text);
  const successText = extractSuccessText(text);
  const transactionId = resolveTransactionId(userReference, text);

  return {
    amount: pickBestAmount(amounts, expectedAmount),
    recipient: pickRecipient(phones, expectedAccount),
    reference: transactionId || pickReference(refs, userReference),
    transactionId,
    successText,
    amounts,
    phones,
    references: refs,
    transactionIds,
    rawText: text.slice(0, 4000),
  };
}

export { normalizePhone, normalizeTransactionId, extractTransactionIds };
