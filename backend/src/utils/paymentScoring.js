import { VERIFICATION_RECOMMENDATION } from '../models/Payment.js';
import { normalizePhone } from './telebirrParser.js';

const AMOUNT_TOLERANCE = 1;

function checkAmount(extracted, expected) {
  const maxPoints = 35;
  if (extracted.amount == null) {
    return {
      id: 'amount_match',
      label: 'Amount matches order total',
      passed: false,
      points: 0,
      maxPoints,
      detail: `Could not read amount from screenshot (expected ${expected} ETB)`,
    };
  }
  const diff = Math.abs(extracted.amount - expected);
  const passed = diff <= AMOUNT_TOLERANCE;
  return {
    id: 'amount_match',
    label: 'Amount matches order total',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Found ${extracted.amount} ETB (expected ${expected} ETB)`
      : `Found ${extracted.amount} ETB but expected ${expected} ETB`,
  };
}

function checkRecipient(extracted, expectedAccount) {
  const maxPoints = 30;
  const expected = normalizePhone(expectedAccount);
  const found = normalizePhone(extracted.recipient);

  if (!expected) {
    return {
      id: 'recipient_match',
      label: 'Recipient is merchant Telebirr account',
      passed: false,
      points: 0,
      maxPoints,
      detail: 'Merchant Telebirr account not configured',
    };
  }

  if (!found) {
    return {
      id: 'recipient_match',
      label: 'Recipient is merchant Telebirr account',
      passed: false,
      points: 0,
      maxPoints,
      detail: `Could not read recipient phone (expected ${expected})`,
    };
  }

  const passed = found === expected;
  return {
    id: 'recipient_match',
    label: 'Recipient is merchant Telebirr account',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Recipient ${found} matches`
      : `Found ${found}, expected ${expected}`,
  };
}

function checkSuccessWording(extracted) {
  const maxPoints = 15;
  const passed = Boolean(extracted.successText);
  return {
    id: 'success_wording',
    label: 'Success wording present',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Found "${extracted.successText}"`
      : 'No success/completed wording detected in screenshot',
  };
}

function checkReferenceMatch(extracted, userReference) {
  const maxPoints = 10;
  if (!userReference?.trim()) {
    return {
      id: 'reference_match',
      label: 'Reference matches user input',
      passed: true,
      points: maxPoints,
      maxPoints,
      detail: 'User did not provide a reference — skipped',
    };
  }

  const userRef = userReference.trim().toUpperCase();
  const found = (extracted.reference || '').toUpperCase();
  const passed =
    Boolean(found) &&
    (found === userRef || found.includes(userRef) || userRef.includes(found));

  return {
    id: 'reference_match',
    label: 'Reference matches user input',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Reference ${found} matches user input`
      : found
        ? `Found ${found}, user entered ${userRef}`
        : `Could not read reference (user entered ${userRef})`,
  };
}

function checkReferenceUnique(extracted, paymentId, duplicateRef) {
  const maxPoints = 10;
  const ref = extracted.reference;
  if (!ref) {
    return {
      id: 'reference_unique',
      label: 'Transaction not reused',
      passed: true,
      points: maxPoints,
      maxPoints,
      detail: 'No reference extracted — skipped',
    };
  }

  const passed = !duplicateRef || String(duplicateRef._id) === String(paymentId);
  return {
    id: 'reference_unique',
    label: 'Transaction not reused',
    passed,
    points: passed ? maxPoints : 0,
    maxPoints,
    detail: passed
      ? `Transaction ${ref} is unique`
      : `VIOLATION: Transaction ${ref} was already used on payment #${duplicateRef._id.toString().slice(-6)}`,
  };
}

function checkOcrQuality(extracted, ocrConfidence) {
  const maxPoints = 10;
  const textLen = (extracted.rawText || '').replace(/\s/g, '').length;
  let points = 0;

  if (textLen >= 40) points += 5;
  else if (textLen >= 15) points += 2;

  if (ocrConfidence >= 75) points += 5;
  else if (ocrConfidence >= 50) points += 3;
  else if (ocrConfidence >= 25) points += 1;

  const passed = points >= 6;
  return {
    id: 'ocr_quality',
    label: 'Screenshot text quality',
    passed,
    points,
    maxPoints,
    detail: `OCR confidence ${Math.round(ocrConfidence)}%, ${textLen} chars read`,
  };
}

export function scorePaymentVerification({
  extracted,
  expectedAmount,
  expectedAccount,
  userReference,
  paymentId,
  duplicateRef,
  ocrConfidence = 0,
}) {
  const checks = [
    checkAmount(extracted, expectedAmount),
    checkRecipient(extracted, expectedAccount),
    checkSuccessWording(extracted),
    checkReferenceMatch(extracted, userReference),
    checkReferenceUnique(extracted, paymentId, duplicateRef),
    checkOcrQuality(extracted, ocrConfidence),
  ];

  const totalPoints = checks.reduce((sum, c) => sum + c.points, 0);
  const maxPoints = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  const confidence = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  const amountFailed = checks.some((c) => c.id === 'amount_match' && !c.passed);
  const recipientFailed = checks.some((c) => c.id === 'recipient_match' && !c.passed);
  const referenceReuseFailed = checks.some((c) => c.id === 'reference_unique' && !c.passed);
  const criticalFailed = amountFailed || recipientFailed || referenceReuseFailed;

  let recommendation = VERIFICATION_RECOMMENDATION.UNCERTAIN;
  if (confidence < 40 || referenceReuseFailed || (amountFailed && recipientFailed)) {
    recommendation = VERIFICATION_RECOMMENDATION.LIKELY_FAKE;
  } else if (confidence >= 70 && !criticalFailed) {
    recommendation = VERIFICATION_RECOMMENDATION.LIKELY_REAL;
  }

  return { confidence, recommendation, checks };
}
