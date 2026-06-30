import crypto from 'crypto';
import Payment, { PAYMENT_STATUS } from '../models/Payment.js';

/** Payments in these statuses count as "consuming" a transaction or receipt. */
export const CONSUMED_PAYMENT_STATUSES = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.APPROVED,
];

export function normalizeTransactionRef(reference) {
  if (!reference || typeof reference !== 'string') return null;
  const normalized = reference.trim().toUpperCase().replace(/\s+/g, '');
  return normalized.length >= 6 ? normalized : null;
}

export function hashProofBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findPaymentUsingTransaction(transactionKey, excludePaymentId) {
  if (!transactionKey) return null;
  const pattern = new RegExp(`^${escapeRegex(transactionKey)}$`, 'i');

  const query = {
    status: { $in: CONSUMED_PAYMENT_STATUSES },
    $or: [
      { transactionKey: transactionKey },
      { telebirrReference: pattern },
      { 'verification.extracted.reference': pattern },
    ],
  };

  if (excludePaymentId) {
    query._id = { $ne: excludePaymentId };
  }

  return Payment.findOne(query).select('_id userId status telebirrReference transactionKey createdAt');
}

export async function findPaymentUsingProofHash(proofHash, excludePaymentId) {
  if (!proofHash) return null;

  const query = {
    proofHash,
    status: { $in: CONSUMED_PAYMENT_STATUSES },
  };

  if (excludePaymentId) {
    query._id = { $ne: excludePaymentId };
  }

  return Payment.findOne(query).select('_id userId status proofHash createdAt');
}

export async function assertTransactionAvailable({ transactionKey, proofHash, excludePaymentId }) {
  const byRef = transactionKey
    ? await findPaymentUsingTransaction(transactionKey, excludePaymentId)
    : null;
  if (byRef) {
    return {
      duplicate: true,
      type: 'transaction_reference',
      existingPaymentId: byRef._id,
      message:
        'This Telebirr transaction reference was already used for another payment. Each receipt can only be used once.',
    };
  }

  const byHash = proofHash ? await findPaymentUsingProofHash(proofHash, excludePaymentId) : null;
  if (byHash) {
    return {
      duplicate: true,
      type: 'proof_image',
      existingPaymentId: byHash._id,
      message:
        'This exact payment screenshot was already submitted for another order. Each receipt can only be used once.',
    };
  }

  return { duplicate: false };
}

export function resolveTransactionKey(telebirrReference, extractedReference) {
  return (
    normalizeTransactionRef(telebirrReference) ||
    normalizeTransactionRef(extractedReference) ||
    null
  );
}
