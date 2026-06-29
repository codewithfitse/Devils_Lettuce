import * as deliveryService from '../services/deliveryService.js';

export async function startDelivery(req, res) {
  const order = await deliveryService.startDelivery(req.params.orderId, req.user);
  res.json({ success: true, data: order });
}

export async function completeDelivery(req, res) {
  const order = await deliveryService.completeDelivery(req.params.orderId, req.user);
  res.json({ success: true, data: order });
}

export async function getDeliveryZones(req, res) {
  const zones = deliveryService.getDeliveryZones();
  res.json({ success: true, data: zones });
}

export async function estimateFee(req, res) {
  const estimate = deliveryService.estimateDeliveryFee(req.query.zone);
  res.json({ success: true, data: estimate });
}

export async function getMyDeliveries(req, res) {
  const deliveries = await deliveryService.getMyDeliveries(req.user);
  res.json({ success: true, data: deliveries });
}

export async function getAvailableOrders(req, res) {
  const orders = await deliveryService.getAvailableOrders(req.user);
  res.json({ success: true, data: orders });
}
