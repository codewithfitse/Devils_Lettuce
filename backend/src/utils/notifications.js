import env from '../config/env.js';

let botInstance = null;

export function setBotInstance(bot) {
  botInstance = bot;
}

async function sendTelegramMessage(chatId, message) {
  if (!botInstance || !chatId) return;
  try {
    await botInstance.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Telegram notification failed:', error.message);
  }
}

export const notifications = {
  async newOrder(merchant, order) {
    if (!merchant.telegramId) return;
    await sendTelegramMessage(
      merchant.telegramId,
      `🛒 <b>New Order #${order._id.toString().slice(-6)}</b>\n` +
        `Total: ${order.totalPrice} ETB\n` +
        `Items: ${order.items.length}\n` +
        `Please accept or reject in your dashboard.`
    );
  },

  async orderAccepted(user, order) {
    if (!user.telegramId) return;
    await sendTelegramMessage(
      user.telegramId,
      `✅ <b>Order Accepted!</b>\n` +
        `Order #${order._id.toString().slice(-6)} has been accepted.\n` +
        `Please upload your Telebirr payment proof.`
    );
  },

  async orderRejected(user, order, reason) {
    if (!user.telegramId) return;
    await sendTelegramMessage(
      user.telegramId,
      `❌ <b>Order Rejected</b>\n` +
        `Order #${order._id.toString().slice(-6)} was rejected.\n` +
        (reason ? `Reason: ${reason}` : '')
    );
  },

  async paymentUploaded(payment) {
    if (!env.telegram.adminChatId) return;
    await sendTelegramMessage(
      env.telegram.adminChatId,
      `💳 <b>Payment Uploaded</b>\n` +
        `Amount: ${payment.totalAmount} ETB\n` +
        `Orders: ${payment.orderIds.length}\n` +
        `Please validate in admin dashboard.`
    );
  },

  async paymentApproved(user, payment) {
    if (!user.telegramId) return;
    await sendTelegramMessage(
      user.telegramId,
      `✅ <b>Payment Approved!</b>\n` +
        `Your payment of ${payment.totalAmount} ETB has been confirmed.\n` +
        `Your order is being prepared for delivery.`
    );
  },

  async paymentRejected(user, payment, reason) {
    if (!user.telegramId) return;
    await sendTelegramMessage(
      user.telegramId,
      `❌ <b>Payment Rejected</b>\n` +
        `Amount: ${payment.totalAmount} ETB\n` +
        (reason ? `Reason: ${reason}` : 'Please upload a new proof.')
    );
  },

  async deliveryStarted(user, order) {
    if (!user.telegramId) return;
    await sendTelegramMessage(
      user.telegramId,
      `🚗 <b>Delivery Started!</b>\n` +
        `Order #${order._id.toString().slice(-6)} is on its way.`
    );
  },

  async orderDelivered(user, order) {
    if (!user.telegramId) return;
    await sendTelegramMessage(
      user.telegramId,
      `🎉 <b>Order Delivered!</b>\n` +
        `Order #${order._id.toString().slice(-6)} has been delivered.\n` +
        `Thank you for shopping with Devil's Lettuce!`
    );
  },

  async orderAvailableForDrivers(order) {
    const { default: User } = await import('../models/User.js');
    const drivers = await User.find({
      isActive: true,
      telegramId: { $exists: true, $ne: null },
      $or: [
        { role: 'driver' },
        { role: 'sub_admin' },
        { 'permissions.canDeliver': true },
      ],
    });

    const message =
      `📢 <b>New Delivery Available!</b>\n` +
      `Order #${order._id.toString().slice(-6)}\n` +
      `Zone: ${order.location?.zone || 'N/A'}\n` +
      `Fee: ${order.deliveryFee || 0} ETB\n` +
      `Open the driver panel to claim it.`;

    await Promise.all(drivers.map((d) => sendTelegramMessage(d.telegramId, message)));
  },

  async orderClaimed(user, order, driver) {
    if (!user.telegramId) return;
    await sendTelegramMessage(
      user.telegramId,
      `🚗 <b>Driver Assigned!</b>\n` +
        `Order #${order._id.toString().slice(-6)} was claimed by ${driver.name}.\n` +
        `Your delivery will start soon.`
    );
  },
};
