import Order, { ORDER_STATUS } from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { splitCartByMerchant, applyDeliveryFee } from '../utils/orderSplitter.js';
import { updateStock } from './productService.js';
import { notifications } from '../utils/notifications.js';

export async function createOrders({ cartItems, location, phone, notes }, user) {
  const merchantGroups = await splitCartByMerchant(cartItems, location?.zone);
  const groupsWithFees = await applyDeliveryFee(merchantGroups, location?.zone);

  const orders = [];
  for (const group of groupsWithFees) {
    const order = await Order.create({
      userId: user._id,
      merchantId: group.merchantId,
      items: group.items,
      totalPrice: group.totalPrice,
      deliveryFee: group.deliveryFee,
      location,
      phone,
      notes,
      status: ORDER_STATUS.PENDING,
    });

    const populated = await order.populate([
      { path: 'merchantId', select: 'name telegramId phone' },
      { path: 'userId', select: 'name phone telegramId' },
    ]);

    orders.push(populated);
    await notifications.newOrder(populated.merchantId, populated);
  }

  return orders;
}

function assertMerchantOwnership(order, requester, message = 'You can only manage your own orders') {
  if (requester.isSuperAdmin()) return;
  const merchantId = order.merchantId._id?.toString() || order.merchantId.toString();
  if (merchantId !== requester._id.toString()) {
    throw new AppError(message, 403);
  }
}

export async function getOrders(filters, requester) {
  const query = {};

  if (requester.isSuperAdmin()) {
    if (filters.merchantId) query.merchantId = filters.merchantId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
  } else if (requester.canManageProducts() && filters.asMerchant) {
    query.merchantId = requester._id;
    if (filters.status) query.status = filters.status;
  } else if (requester.canDeliverOrders() && filters.asDriver) {
    query.assignedDriverId = requester._id;
    if (filters.status) query.status = filters.status;
  } else {
    query.userId = requester._id;
    if (filters.status) query.status = filters.status;
  }

  return Order.find(query)
    .populate('userId', 'name phone telegramId')
    .populate('merchantId', 'name phone')
    .populate('assignedDriverId', 'name phone')
    .populate('paymentId')
    .sort({ createdAt: -1 });
}

export async function getOrderById(id, requester) {
  const order = await Order.findById(id)
    .populate('userId', 'name phone telegramId')
    .populate('merchantId', 'name phone telegramId')
    .populate('assignedDriverId', 'name phone')
    .populate('paymentId');

  if (!order) throw new AppError('Order not found', 404);
  assertOrderAccess(order, requester);
  return order;
}

function assertOrderAccess(order, requester) {
  if (requester.isSuperAdmin()) return;

  const userId = order.userId._id?.toString() || order.userId.toString();
  const merchantId = order.merchantId._id?.toString() || order.merchantId.toString();
  const driverId = order.assignedDriverId?._id?.toString() || order.assignedDriverId?.toString();

  const isOwner = userId === requester._id.toString();
  const isMerchant = merchantId === requester._id.toString();
  const isDriver = driverId === requester._id.toString();

  if (!isOwner && !isMerchant && !isDriver) {
    throw new AppError('Access denied', 403);
  }
}

export async function acceptOrder(id, requester) {
  const order = await Order.findById(id).populate('userId', 'name telegramId');
  if (!order) throw new AppError('Order not found', 404);

  assertMerchantOwnership(order, requester, 'Only the merchant who owns this order can accept it');
  if (order.status !== ORDER_STATUS.PENDING) {
    throw new AppError(`Cannot accept order in status: ${order.status}`, 400);
  }

  order.status = ORDER_STATUS.ACCEPTED;
  await order.save();
  await notifications.orderAccepted(order.userId, order);
  return order;
}

export async function rejectOrder(id, requester, reason) {
  const order = await Order.findById(id).populate('userId', 'name telegramId');
  if (!order) throw new AppError('Order not found', 404);

  assertMerchantOwnership(order, requester, 'Only the merchant who owns this order can reject it');
  if (![ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED].includes(order.status)) {
    throw new AppError(`Cannot reject order in status: ${order.status}`, 400);
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledBy = requester._id;
  order.cancelReason = reason;
  await order.save();
  await notifications.orderRejected(order.userId, order, reason);
  return order;
}

export async function markPaymentPending(orderIds, user) {
  const orders = await Order.find({
    _id: { $in: orderIds },
    userId: user._id,
    status: ORDER_STATUS.ACCEPTED,
  });

  if (orders.length !== orderIds.length) {
    throw new AppError('Some orders are not eligible for payment', 400);
  }

  for (const order of orders) {
    order.status = ORDER_STATUS.PAYMENT_PENDING;
    await order.save();
  }

  return orders;
}

export async function assignDriver(orderId, driverId, requester) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  if (!requester.isSuperAdmin()) {
    throw new AppError('Only super admin can manually assign drivers', 403);
  }
  if (![ORDER_STATUS.PAID, ORDER_STATUS.AVAILABLE_FOR_DELIVERY].includes(order.status)) {
    throw new AppError('Can only assign driver to paid or pool orders', 400);
  }

  const driver = await User.findById(driverId);
  if (!driver?.canDeliverOrders()) {
    throw new AppError('Invalid driver', 400);
  }

  order.assignedDriverId = driverId;
  order.claimedAt = new Date();
  await order.save();

  const populated = await order.populate([
    { path: 'userId', select: 'name phone telegramId' },
    { path: 'merchantId', select: 'name phone' },
  ]);

  await notifications.driverAssigned(driver, populated);
  return populated.populate('assignedDriverId', 'name phone');
}

export async function makeAvailableForDelivery(orderId, requester) {
  const order = await Order.findById(orderId)
    .populate('userId', 'name telegramId')
    .populate('merchantId', 'name');
  if (!order) throw new AppError('Order not found', 404);

  assertMerchantOwnership(order, requester, 'You can only release your own orders to drivers');
  if (order.status !== ORDER_STATUS.PAID) {
    throw new AppError('Only paid orders can be released to drivers', 400);
  }
  if (order.assignedDriverId) {
    throw new AppError('Order already has a driver assigned', 400);
  }

  order.status = ORDER_STATUS.AVAILABLE_FOR_DELIVERY;
  order.madeAvailableBy = requester._id;
  order.madeAvailableAt = new Date();
  await order.save();

  await notifications.orderAvailableForDrivers(order);
  return order;
}

export async function claimOrder(orderId, driver) {
  if (!driver.canDeliverOrders()) {
    throw new AppError('You do not have delivery permissions', 403);
  }

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: ORDER_STATUS.AVAILABLE_FOR_DELIVERY,
      assignedDriverId: null,
    },
    {
      $set: {
        assignedDriverId: driver._id,
        claimedAt: new Date(),
      },
    },
    { new: true }
  )
    .populate('userId', 'name phone telegramId')
    .populate('merchantId', 'name phone');

  if (!order) {
    throw new AppError('Order is no longer available to claim', 409);
  }

  await notifications.orderClaimed(order.userId, order, driver);
  return order;
}

export async function deliverSelf(orderId, requester) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  assertMerchantOwnership(order, requester, 'You can only deliver your own orders');
  if (order.status !== ORDER_STATUS.PAID) {
    throw new AppError('Only paid orders can be self-delivered', 400);
  }
  if (order.assignedDriverId) {
    throw new AppError('Order already has a driver assigned', 400);
  }
  if (!requester.canDeliverOrders() && !requester.isSuperAdmin()) {
    throw new AppError('You do not have delivery permissions', 403);
  }

  order.assignedDriverId = requester._id;
  order.claimedAt = new Date();
  await order.save();

  const populated = await order.populate([
    { path: 'userId', select: 'name phone telegramId' },
    { path: 'merchantId', select: 'name phone' },
    { path: 'assignedDriverId', select: 'name phone telegramId' },
  ]);

  await notifications.driverAssigned(requester, populated);
  return populated;
}

export async function deductStockForOrder(order) {
  for (const item of order.items) {
    await updateStock(item.productId, item.quality, item.quantity);
  }
}
