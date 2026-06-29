import * as orderService from '../services/orderService.js';

export async function createOrders(req, res) {
  const orders = await orderService.createOrders(req.body, req.user);
  res.status(201).json({ success: true, data: orders });
}

export async function getOrders(req, res) {
  const orders = await orderService.getOrders(req.query, req.user);
  res.json({ success: true, data: orders });
}

export async function getOrder(req, res) {
  const order = await orderService.getOrderById(req.params.id, req.user);
  res.json({ success: true, data: order });
}

export async function acceptOrder(req, res) {
  const order = await orderService.acceptOrder(req.params.id, req.user);
  res.json({ success: true, data: order });
}

export async function rejectOrder(req, res) {
  const order = await orderService.rejectOrder(req.params.id, req.user, req.body.reason);
  res.json({ success: true, data: order });
}

export async function assignDriver(req, res) {
  const order = await orderService.assignDriver(req.params.id, req.body.driverId, req.user);
  res.json({ success: true, data: order });
}

export async function makeAvailableForDelivery(req, res) {
  const order = await orderService.makeAvailableForDelivery(req.params.id, req.user);
  res.json({ success: true, data: order });
}

export async function claimOrder(req, res) {
  const order = await orderService.claimOrder(req.params.id, req.user);
  res.json({ success: true, data: order });
}

export async function deliverSelf(req, res) {
  const order = await orderService.deliverSelf(req.params.id, req.user);
  res.json({ success: true, data: order });
}

export async function getMerchantOrders(req, res) {
  const orders = await orderService.getOrders({ ...req.query, asMerchant: true }, req.user);
  res.json({ success: true, data: orders });
}
