import { VERIFICATION_RECOMMENDATION } from '../models/Payment.js';
import { normalizePhone } from './telebirrParser.js';

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function accountLast4(account) {
  const digits = String(account || '').replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

function checkReceiptLink(receipt) {
  const maxPoints = 10;
  const passed = receipt?.ok === true;
  return {
    id: 'receipt_link',
    label: 'Official receipt link works',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Verified via ${receipt.receiptUrl}`
      : receipt?.fetchError || 'Could not load official receipt',
  };
}

function checkTransactionStatus(receipt) {
  const maxPoints = 20;
  const status = String(receipt?.transactionStatus || '').trim().toLowerCase();
  const passed = status === 'completed' || status.includes('completed');
  return {
    id: 'transaction_status',
    label: 'Transaction status is Completed',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Status: ${receipt.transactionStatus}`
      : `Found: ${receipt?.transactionStatus || 'unknown'}`,
  };
}

function checkCreditedPartyName(receipt, expectedName) {
  const maxPoints = 25;
  const found = normalizeName(receipt?.creditedPartyName);
  const expected = normalizeName(expectedName);
  const passed = Boolean(found && found === expected);
  return {
    id: 'credited_party_name',
    label: 'Credited party name matches',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? receipt.creditedPartyName
      : `Expected "${expectedName}", found "${receipt?.creditedPartyName || '—'}"`,
  };
}

function checkCreditedPartyAccount(receipt, expectedAccount) {
  const maxPoints = 25;
  const expectedLast4 = accountLast4(expectedAccount);
  const foundAccount = receipt?.creditedPartyAccount || '';
  const foundLast4 = accountLast4(foundAccount);
  const has251Prefix = foundAccount.includes('2519') || foundAccount.startsWith('251');

  const passed =
    Boolean(expectedLast4 && foundLast4) &&
    expectedLast4 === foundLast4 &&
    (has251Prefix || foundAccount.includes('****'));

  return {
    id: 'credited_party_account',
    label: 'Credited party account matches',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? foundAccount
      : `Expected account ending ${expectedLast4}, found "${foundAccount || '—'}"`,
  };
}

function checkSettledAmount(receipt, expectedAmount) {
  const maxPoints = 20;
  const settled = receipt?.settledAmount;
  const passed = settled != null && settled >= expectedAmount;
  return {
    id: 'settled_amount',
    label: 'Settled amount covers order total',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Settled ${settled} ETB (order ${expectedAmount} ETB)`
      : settled != null
        ? `Settled ${settled} ETB is less than order ${expectedAmount} ETB`
        : 'Settled amount not found on receipt',
  };
}

export function scoreOfficialReceipt({ receipt, expectedAmount, expectedAccount, expectedName }) {
  const checks = [
    checkReceiptLink(receipt),
    checkTransactionStatus(receipt),
    checkCreditedPartyName(receipt, expectedName),
    checkCreditedPartyAccount(receipt, expectedAccount),
    checkSettledAmount(receipt, expectedAmount),
  ];

  const totalPoints = checks.reduce((sum, c) => sum + c.points, 0);
  const maxPoints = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  const confidence = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  const criticalIds = [
    'credited_party_name',
    'credited_party_account',
    'transaction_status',
    'settled_amount',
  ];
  const criticalFailed = checks.some((c) => criticalIds.includes(c.id) && !c.passed);
  const linkFailed = checks.some((c) => c.id === 'receipt_link' && !c.passed);

  let recommendation = VERIFICATION_RECOMMENDATION.UNCERTAIN;
  if (linkFailed) {
    recommendation = VERIFICATION_RECOMMENDATION.UNCERTAIN;
  } else if (confidence < 40 || criticalFailed) {
    recommendation = VERIFICATION_RECOMMENDATION.LIKELY_FAKE;
  } else if (confidence >= 70 && !criticalFailed) {
    recommendation = VERIFICATION_RECOMMENDATION.LIKELY_REAL;
  }

  return { confidence, recommendation, checks };
}

export { accountLast4, normalizeName };
