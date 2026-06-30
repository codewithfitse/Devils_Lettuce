import axios from 'axios';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import Payment, { VERIFICATION_STATUS } from '../models/Payment.js';
import env from '../config/env.js';
import { parseTelebirrText } from '../utils/telebirrParser.js';
import { scorePaymentVerification } from '../utils/paymentScoring.js';
import { notifications } from '../utils/notifications.js';
import {
  assertTransactionAvailable,
  findPaymentUsingTransaction,
  hashProofBuffer,
  resolveTransactionKey,
} from '../utils/transactionDuplicate.js';
import { rejectPaymentForDuplicate } from './paymentViolationService.js';

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker(env.tesseractLang);
      return worker;
    })();
  }
  return workerPromise;
}

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 10 * 1024 * 1024,
  });
  return Buffer.from(response.data);
}

async function preprocessImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

async function runOcr(imageBuffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageBuffer);
  return {
    text: data.text || '',
    confidence: data.confidence ?? 0,
  };
}

async function findDuplicateReference(reference, paymentId) {
  return findPaymentUsingTransaction(reference, paymentId);
}

export async function processPaymentVerification(paymentId) {
  if (!env.paymentVerifyEnabled) return;

  const payment = await Payment.findById(paymentId);
  if (!payment?.proof) return;

  payment.verification = {
    status: VERIFICATION_STATUS.PROCESSING,
  };
  await payment.save();

  try {
    const imageBuffer = await downloadImage(payment.proof);
    const proofHash = payment.proofHash || hashProofBuffer(imageBuffer);

    const hashDuplicate = await assertTransactionAvailable({
      proofHash,
      excludePaymentId: payment._id,
    });
    if (hashDuplicate.duplicate) {
      await rejectPaymentForDuplicate(payment, {
        reason: hashDuplicate.message,
        duplicateOfPaymentId: hashDuplicate.existingPaymentId,
        duplicateType: 'proof_image',
      });
      return;
    }

    if (!payment.proofHash) {
      payment.proofHash = proofHash;
      await payment.save();
    }

    const preprocessed = await preprocessImage(imageBuffer);
    const { text, confidence: ocrConfidence } = await runOcr(preprocessed);

    const extracted = parseTelebirrText(text, {
      expectedAmount: payment.totalAmount,
      expectedAccount: env.telebirrAccount,
      userReference: payment.telebirrReference,
    });

    const duplicateRef = await findDuplicateReference(extracted.reference, payment._id);

    if (duplicateRef) {
      await rejectPaymentForDuplicate(payment, {
        reason:
          'This Telebirr transaction was already used for another payment. Each receipt can only be used once.',
        duplicateOfPaymentId: duplicateRef._id,
        duplicateType: 'transaction_reference',
      });
      return;
    }

    const transactionKey = resolveTransactionKey(
      payment.telebirrReference,
      extracted.reference
    );
    if (transactionKey) {
      payment.transactionKey = transactionKey;
    }

    const { confidence, recommendation, checks } = scorePaymentVerification({
      extracted,
      expectedAmount: payment.totalAmount,
      expectedAccount: env.telebirrAccount,
      userReference: payment.telebirrReference,
      paymentId: payment._id,
      duplicateRef,
      ocrConfidence,
    });

    payment.verification = {
      status: VERIFICATION_STATUS.COMPLETED,
      confidence,
      recommendation,
      duplicateViolation: false,
      extracted: {
        amount: extracted.amount,
        recipient: extracted.recipient,
        reference: extracted.reference,
        successText: extracted.successText,
        rawText: extracted.rawText,
      },
      checks,
      processedAt: new Date(),
    };
    await payment.save();

    await notifications.paymentVerificationComplete(
      await payment.populate([
        { path: 'userId', select: 'name phone' },
        { path: 'orderIds', populate: { path: 'merchantId', select: 'name telegramId' } },
      ])
    );
  } catch (error) {
    console.error('Payment verification failed:', paymentId, error.message);
    payment.verification = {
      status: VERIFICATION_STATUS.FAILED,
      error: error.message || 'Verification failed',
      processedAt: new Date(),
    };
    await payment.save();
  }
}

export function schedulePaymentVerification(paymentId) {
  if (!env.paymentVerifyEnabled) return;
  setImmediate(() => {
    processPaymentVerification(paymentId).catch((err) => {
      console.error('Payment verification worker error:', err.message);
    });
  });
}
