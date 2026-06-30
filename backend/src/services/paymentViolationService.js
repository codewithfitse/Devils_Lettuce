import User from '../models/User.js';
import Payment, { PAYMENT_STATUS, VERIFICATION_RECOMMENDATION } from '../models/Payment.js';
import Order, { ORDER_STATUS } from '../models/Order.js';
import { notifications } from '../utils/notifications.js';

export async function recordPaymentViolation(userId, paymentId, reason) {
  if (userId) {
    await User.findByIdAndUpdate(userId, { $inc: { paymentViolationCount: 1 } });
  }

  if (paymentId) {
    await Payment.findByIdAndUpdate(paymentId, {
      duplicateViolation: true,
      violationReason: reason,
    });
  }
}

export async function rejectPaymentForDuplicate(payment, {
  reason,
  duplicateOfPaymentId,
  duplicateType,
}) {
  if (!payment || payment.status !== PAYMENT_STATUS.PENDING) return payment;

  payment.status = PAYMENT_STATUS.REJECTED;
  payment.reviewedAt = new Date();
  payment.rejectionReason = reason;
  payment.duplicateViolation = true;
  payment.violationReason = reason;
  payment.duplicateOfPaymentId = duplicateOfPaymentId;
  payment.duplicateType = duplicateType;

  if (payment.verification) {
    payment.verification.recommendation = VERIFICATION_RECOMMENDATION.LIKELY_FAKE;
    payment.verification.duplicateViolation = true;
  }

  await payment.save();

  const orders = await Order.find({ _id: { $in: payment.orderIds } });
  for (const order of orders) {
    order.status = ORDER_STATUS.ACCEPTED;
    order.paymentId = undefined;
    await order.save();
  }

  const populated = await payment.populate([
    { path: 'userId', select: 'name telegramId phone' },
    { path: 'orderIds', populate: { path: 'merchantId', select: 'name telegramId' } },
  ]);
  await recordPaymentViolation(payment.userId?._id || payment.userId, payment._id, reason);
  await notifications.paymentDuplicateViolation(populated, duplicateOfPaymentId);
  await notifications.paymentRejected(populated.userId, populated, reason);

  return populated;
}
