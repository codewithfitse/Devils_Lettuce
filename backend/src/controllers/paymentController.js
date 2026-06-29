import * as paymentService from '../services/paymentService.js';
import { uploadImage as uploadToCloudinary } from '../services/cloudinaryService.js';

export async function createPayment(req, res) {
  let proofUrl = req.body.proof;
  if (req.file) {
    proofUrl = await uploadToCloudinary(req.file);
  }
  if (!proofUrl) {
    return res.status(400).json({ success: false, message: 'Payment proof required' });
  }

  let orderIds = req.body.orderIds;
  if (typeof orderIds === 'string') {
    try {
      orderIds = JSON.parse(orderIds);
    } catch {
      orderIds = orderIds.split(',').map((id) => id.trim());
    }
  }

  const payment = await paymentService.createPayment(
    { ...req.body, orderIds },
    req.user,
    proofUrl
  );
  res.status(201).json({ success: true, data: payment });
}

export async function getPayments(req, res) {
  const payments = await paymentService.getPayments(req.query, req.user);
  res.json({ success: true, data: payments });
}

export async function getPayment(req, res) {
  const payment = await paymentService.getPaymentById(req.params.id, req.user);
  res.json({ success: true, data: payment });
}

export async function approvePayment(req, res) {
  const payment = await paymentService.approvePayment(req.params.id, req.user);
  res.json({ success: true, data: payment });
}

export async function rejectPayment(req, res) {
  const payment = await paymentService.rejectPayment(req.params.id, req.user, req.body.reason);
  res.json({ success: true, data: payment });
}
