import Order, { ORDER_STATUS } from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifications } from '../utils/notifications.js';
import { getAllZoneKeys } from '../utils/deliveryPricing.js';
import Product from '../models/Product.js';
import * as deliveryPricing from './deliveryPricingService.js';

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

export function getDeliveryZones() {
  return deliveryPricing.getZones();
}

export async function getZonesForProducts(productIds) {
  if (!productIds?.length) return deliveryPricing.getZones();

  const ids = [...new Set(productIds.map(String))];
  const products = await Product.find({
    _id: { $in: ids },
    isActive: true,
    isApproved: true,
  });

  if (!products.length) return deliveryPricing.getZones();

  const zoneLists = products.map((p) => (p.deliveryZones?.length ? p.deliveryZones : getAllZoneKeys()));
  const common = zoneLists.reduce((acc, list) => acc.filter((z) => list.includes(z)));

  const zones = await deliveryPricing.getZones();
  const zoneMap = new Map(zones.map((z) => [z.key, z]));
  return common.map((k) => zoneMap.get(k)).filter(Boolean);
}

export async function estimateDeliveryFee(zone) {
  return { zone, fee: await deliveryPricing.getFee(zone) };
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
