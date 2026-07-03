import * as deliveryPricing from '../services/deliveryPricingService.js';

export async function getDeliveryPricing(req, res) {
  const zones = await deliveryPricing.getZones({ useCache: false });
  res.json({ success: true, data: zones });
}

export async function updateDeliveryPricing(req, res) {
  const zones = await deliveryPricing.setFees(req.body?.zones, req.user);
  res.json({ success: true, data: zones });
}

