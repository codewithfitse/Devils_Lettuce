import Order, { ORDER_STATUS } from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifications } from '../utils/notifications.js';
import Product from '../models/Product.js';
import * as areaService from './areaService.js';
import { calculateDeliveryPrice } from '../utils/deliveryPricing.js';

function isAssignedDeliverer(order, requester) {
  const driverId = order.assignedDriverId?._id?.toString() || order.assignedDriverId?.toString();
  return driverId === requester._id.toString();
}

export async function getAvailableOrders(requester) {
  if (!requester.canDeliverOrders() && !requester.isSuperAdmin()) {
    throw new AppError('No delivery permissions', 403);
  }

  return Order.find({
    status: ORDER_STATUS.AVAILABLE_FOR_DELIVERY,
    assignedDriverId: null,
  })
    .populate('userId', 'name phone')
    .populate('merchantId', 'name phone')
    .sort({ madeAvailableAt: -1 });
}

export async function startDelivery(orderId, requester) {
  const order = await Order.findById(orderId).populate('userId', 'name telegramId');
  if (!order) throw new AppError('Order not found', 404);

  const canStart =
    [ORDER_STATUS.PAID, ORDER_STATUS.AVAILABLE_FOR_DELIVERY].includes(order.status) &&
    isAssignedDeliverer(order, requester);

  if (!canStart) {
    throw new AppError('You must claim this order before starting delivery', 400);
  }

  if (!requester.canDeliverOrders() && !requester.isSuperAdmin()) {
    throw new AppError('You do not have delivery permissions', 403);
  }

  order.status = ORDER_STATUS.DELIVERING;
  await order.save();
  await notifications.deliveryStarted(order.userId, order);
  return order;
}

export async function completeDelivery(orderId, requester) {
  const order = await Order.findById(orderId).populate('userId', 'name telegramId');
  if (!order) throw new AppError('Order not found', 404);

  if (order.status !== ORDER_STATUS.DELIVERING) {
    throw new AppError('Order is not currently being delivered', 400);
  }

  const canDeliver =
    requester.isSuperAdmin() ||
    isAssignedDeliverer(order, requester);

  if (!canDeliver) {
    throw new AppError('Only the assigned driver can complete delivery', 403);
  }

  order.status = ORDER_STATUS.COMPLETED;
  await order.save();
  await notifications.orderDelivered(order.userId, order);
  return order;
}

export async function getMyCompletedDeliveries(requester) {
  if (!requester.canDeliverOrders() && !requester.isSuperAdmin()) {
    throw new AppError('No delivery permissions', 403);
  }

  return Order.find({
    assignedDriverId: requester._id,
    status: ORDER_STATUS.COMPLETED,
  })
    .populate('userId', 'name phone')
    .populate('merchantId', 'name phone')
    .sort({ updatedAt: -1 });
}

export async function getDeliveryAreas() {
  return areaService.getAllAreas();
}

/** @deprecated alias */
export function getDeliveryZones() {
  return getDeliveryAreas();
}

function getAllowedAreaKeys(product) {
  if (product?.deliveryOptions?.length) {
    return product.deliveryOptions.map((o) => o.key);
  }
  return product?.deliveryZones?.length ? product.deliveryZones : null;
}

export async function getAreasForProducts(productIds) {
  const allAreas = await areaService.getAllAreas();
  if (!productIds?.length) return allAreas;

  const ids = [...new Set(productIds.map(String))];
  const products = await Product.find({
    _id: { $in: ids },
    isActive: true,
    isApproved: true,
  });

  if (!products.length) return allAreas;

  const areaLists = products.map((p) => {
    const allowed = getAllowedAreaKeys(p);
    return allowed ?? allAreas.map((a) => a.key);
  });

  const common = areaLists.reduce((acc, list) => acc.filter((k) => list.includes(k)));
  const areaMap = new Map(allAreas.map((a) => [a.key, a]));
  return common.map((k) => areaMap.get(k)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}

/** @deprecated alias */
export async function getZonesForProducts(productIds) {
  return getAreasForProducts(productIds);
}

function productAllowsArea(product, areaKey) {
  const allowed = getAllowedAreaKeys(product);
  if (!allowed) return true;
  return allowed.includes(areaKey);
}

/**
 * Estimate total delivery fee for the cart:
 * - Orders are split per merchant
 * - For each merchant, delivery fee = area price if any product allows the area
 * - Total estimate = sum of merchant delivery fees
 */
export async function estimateDeliveryFee(areaKey, productIds = []) {
  const area = await areaService.getAreaByKey(areaKey);
  if (!area) {
    throw new AppError(`Unknown delivery area: ${areaKey}`, 400);
  }

  const sharedFee = area.price;
  const ids = Array.isArray(productIds) ? productIds : [];

  if (!ids.length) {
    return { zone: areaKey, area: area.name, km: area.km, fee: sharedFee };
  }

  const products = await Product.find({
    _id: { $in: ids },
    isActive: true,
    isApproved: true,
  }).select('ownerId deliveryZones deliveryOptions');

  if (!products.length) {
    return { zone: areaKey, area: area.name, km: area.km, fee: sharedFee };
  }

  const byMerchant = new Map();
  for (const p of products) {
    if (!productAllowsArea(p, areaKey)) continue;
    const merchantId = p.ownerId?.toString?.() || p.ownerId;
    if (!byMerchant.has(merchantId)) byMerchant.set(merchantId, []);
    byMerchant.get(merchantId).push(p);
  }

  let total = 0;
  for (const [, merchantProducts] of byMerchant.entries()) {
    if (merchantProducts.length) total += sharedFee;
  }

  return { zone: areaKey, area: area.name, km: area.km, fee: total };
}

export async function getMyDeliveries(requester) {
  if (!requester.canDeliverOrders() && !requester.isSuperAdmin()) {
    throw new AppError('No delivery permissions', 403);
  }

  return Order.find({
    assignedDriverId: requester._id,
    status: { $in: [ORDER_STATUS.AVAILABLE_FOR_DELIVERY, ORDER_STATUS.DELIVERING] },
  })
    .populate('userId', 'name phone')
    .populate('merchantId', 'name phone')
    .sort({ claimedAt: -1, createdAt: -1 });
}

export async function getAreasForProductsByZone(productIds, zoneGroup) {
  const areas = await getAreasForProducts(productIds);
  return areas.filter((a) => a.zone === zoneGroup);
}

export { calculateDeliveryPrice };
