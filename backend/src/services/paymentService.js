import Payment, { PAYMENT_STATUS } from '../models/Payment.js';
import Order, { ORDER_STATUS } from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifications } from '../utils/notifications.js';
import { deductStockForOrder } from './orderService.js';
import { schedulePaymentVerification } from './paymentVerificationService.js';
import {
  assertTransactionAvailable,
  hashProofBuffer,
  normalizeTransactionRef,
  resolveTransactionKey,
} from '../utils/transactionDuplicate.js';
import { recordPaymentViolation } from './paymentViolationService.js';
import axios from 'axios';

const PAYMENT_EXPIRY_MS = 24 * 60 * 60 * 1000;

async function resolveProofHash(proofUrl, proofBuffer) {
  if (proofBuffer) return hashProofBuffer(proofBuffer);
  if (!proofUrl) return null;

  const response = await axios.get(proofUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 10 * 1024 * 1024,
  });
  return hashProofBuffer(Buffer.from(response.data));
}

export async function createPayment(
  { orderIds, telebirrReference },
  user,
  proofUrl,
  proofBuffer = null
) {
  const orders = await Order.find({
    _id: { $in: orderIds },
    userId: user._id,
    status: ORDER_STATUS.ACCEPTED,
  });

  if (orders.length === 0) {
    const pendingPayment = await Order.find({
      _id: { $in: orderIds },
      userId: user._id,
      status: ORDER_STATUS.PAYMENT_PENDING,
    });
    if (pendingPayment.length > 0) {
      throw new AppError('Payment already submitted for these orders', 400);
    }
    throw new AppError('No eligible orders for payment', 400);
  }

  const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice + o.deliveryFee, 0);

  const transactionKey = normalizeTransactionRef(telebirrReference);
  const proofHash = await resolveProofHash(proofUrl, proofBuffer);

  const duplicateCheck = await assertTransactionAvailable({ transactionKey, proofHash });
  if (duplicateCheck.duplicate) {
    await recordPaymentViolation(
      user._id,
      null,
      duplicateCheck.message
    );
    throw new AppError(duplicateCheck.message, 400);
  }

  const payment = await Payment.create({
    userId: user._id,
    orderIds: orders.map((o) => o._id),
    totalAmount,
    proof: proofUrl,
    proofHash,
    telebirrReference,
    transactionKey,
    status: PAYMENT_STATUS.PENDING,
    expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MS),
  });

  for (const order of orders) {
    order.status = ORDER_STATUS.PAYMENT_PENDING;
    order.paymentId = payment._id;
    await order.save();
  }

  await notifications.paymentUploaded(
    await payment.populate([
      { path: 'userId', select: 'name phone telegramId' },
      { path: 'orderIds', populate: { path: 'merchantId', select: 'name telegramId' } },
    ])
  );
  schedulePaymentVerification(payment._id);
  return payment.populate('orderIds');
}

export async function getPayments(filters, requester) {
  const query = {};

  if (requester.isSuperAdmin()) {
    if (filters.status) query.status = filters.status;
  } else {
    query.userId = requester._id;
    if (filters.status) query.status = filters.status;
  }

  return Payment.find(query)
    .populate('userId', 'name phone telegramId')
    .populate({
      path: 'orderIds',
      populate: { path: 'merchantId', select: 'name' },
    })
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
}

export async function getPaymentById(id, requester) {
  const payment = await Payment.findById(id)
    .populate('userId', 'name phone telegramId')
    .populate('orderIds')
    .populate('reviewedBy', 'name');

  if (!payment) throw new AppError('Payment not found', 404);

  if (!requester.isSuperAdmin() && payment.userId._id.toString() !== requester._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  return payment;
}

export async function approvePayment(id, requester) {
  if (!requester.isSuperAdmin()) {
    throw new AppError('Only super admin can approve payments', 403);
  }

  const payment = await Payment.findById(id).populate('userId', 'name telegramId');
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new AppError(`Payment is already ${payment.status}`, 400);
  }
  if (payment.expiresAt < new Date()) {
    payment.status = PAYMENT_STATUS.EXPIRED;
    await payment.save();
    throw new AppError('Payment has expired', 400);
  }

  const transactionKey = resolveTransactionKey(
    payment.telebirrReference,
    payment.verification?.extracted?.reference
  );
  if (transactionKey) {
    const duplicateCheck = await assertTransactionAvailable({
      transactionKey,
      proofHash: payment.proofHash,
      excludePaymentId: payment._id,
    });
    if (duplicateCheck.duplicate) {
      throw new AppError(
        'Cannot approve: this Telebirr transaction was already used on another payment.',
        400
      );
    }
    payment.transactionKey = transactionKey;
  }

  payment.status = PAYMENT_STATUS.APPROVED;
  payment.reviewedBy = requester._id;
  payment.reviewedAt = new Date();
  await payment.save();

  const orders = await Order.find({ _id: { $in: payment.orderIds } });
  for (const order of orders) {
    order.status = ORDER_STATUS.PAID;
    await order.save();
    await deductStockForOrder(order);
  }

  await notifications.paymentApproved(payment.userId, payment);
  return payment;
}

export async function rejectPayment(id, requester, reason) {
  if (!requester.isSuperAdmin()) {
    throw new AppError('Only super admin can reject payments', 403);
  }

  const payment = await Payment.findById(id).populate('userId', 'name telegramId');
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new AppError(`Payment is already ${payment.status}`, 400);
  }

  payment.status = PAYMENT_STATUS.REJECTED;
  payment.reviewedBy = requester._id;
  payment.reviewedAt = new Date();
  payment.rejectionReason = reason;
  await payment.save();

  const orders = await Order.find({ _id: { $in: payment.orderIds } });
  for (const order of orders) {
    order.status = ORDER_STATUS.ACCEPTED;
    order.paymentId = undefined;
    await order.save();
  }

  await notifications.paymentRejected(payment.userId, payment, reason);
  return payment;
}

export async function expireStalePayments() {
  const expired = await Payment.find({
    status: PAYMENT_STATUS.PENDING,
    expiresAt: { $lt: new Date() },
  });

  for (const payment of expired) {
    payment.status = PAYMENT_STATUS.EXPIRED;
    await payment.save();

    await Order.updateMany(
      { _id: { $in: payment.orderIds }, status: ORDER_STATUS.PAYMENT_PENDING },
      { status: ORDER_STATUS.ACCEPTED, $unset: { paymentId: 1 } }
    );
  }

  return expired.length;
}
