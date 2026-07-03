import axios from 'axios';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import Payment, { VERIFICATION_STATUS, VERIFICATION_RECOMMENDATION } from '../models/Payment.js';
import env from '../config/env.js';
import { resolveTransactionId } from '../utils/telebirrParser.js';
import { scoreOfficialReceipt } from '../utils/officialReceiptScoring.js';
import { fetchOfficialReceipt } from '../services/telebirrReceiptService.js';
import { notifications } from '../utils/notifications.js';
import {
  assertTransactionAvailable,
  findPaymentUsingTransaction,
  hashProofBuffer,
  normalizeTransactionRef,
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
  return data.text || '';
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
    const ocrText = await runOcr(preprocessed);
    const transactionId = resolveTransactionId(payment.telebirrReference, ocrText);

    if (!transactionId) {
      payment.verification = {
        status: VERIFICATION_STATUS.COMPLETED,
        confidence: 0,
        recommendation: VERIFICATION_RECOMMENDATION.UNCERTAIN,
        error: 'Could not read Transaction Number from screenshot. Ask user to enter it.',
        extracted: { rawText: ocrText.slice(0, 4000), reference: null },
        checks: [{
          id: 'transaction_id',
          label: 'Transaction Number found',
          passed: false,
          points: 0,
          maxPoints: 10,
          detail: 'Enter Transaction Number on upload (e.g. DG38HZNHRO)',
        }],
        processedAt: new Date(),
      };
      await payment.save();
      await notifications.paymentVerificationComplete(
        await payment.populate([
          { path: 'userId', select: 'name phone' },
          { path: 'orderIds', populate: { path: 'merchantId', select: 'name telegramId' } },
        ])
      );
      return;
    }

    const duplicateRef = await findPaymentUsingTransaction(transactionId, payment._id);
    if (duplicateRef) {
      await rejectPaymentForDuplicate(payment, {
        reason:
          'This Telebirr transaction was already used for another payment. Each receipt can only be used once.',
        duplicateOfPaymentId: duplicateRef._id,
        duplicateType: 'transaction_reference',
      });
      return;
    }

    payment.transactionKey = normalizeTransactionRef(transactionId);
    const receipt = await fetchOfficialReceipt(transactionId);

    const { confidence, recommendation, checks } = scoreOfficialReceipt({
      receipt,
      expectedAmount: payment.totalAmount,
      expectedAccount: env.telebirrAccount,
      expectedName: env.telebirrRecipientName,
    });

    payment.verification = {
      status: VERIFICATION_STATUS.COMPLETED,
      confidence,
      recommendation,
      duplicateViolation: false,
      extracted: {
        reference: transactionId,
        rawText: ocrText.slice(0, 4000),
      },
      officialReceipt: {
        transactionId,
        receiptUrl: receipt.receiptUrl,
        creditedPartyName: receipt.creditedPartyName || null,
        creditedPartyAccount: receipt.creditedPartyAccount || null,
        transactionStatus: receipt.transactionStatus || null,
        settledAmount: receipt.settledAmount ?? null,
        invoiceNo: receipt.invoiceNo || null,
        fetchedAt: receipt.fetchedAt || new Date(),
        fetchError: receipt.fetchError || null,
        httpStatus: receipt.httpStatus || null,
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
