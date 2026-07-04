import env from '../config/env.js';
import { getZoneName } from './deliveryPricing.js';

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

async function sendTelegramPhoto(chatId, photoUrl, caption) {
  if (!botInstance || !chatId) return;
  try {
    await botInstance.telegram.sendPhoto(chatId, photoUrl, {
      caption,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Telegram photo failed:', error.message);
    await sendTelegramMessage(chatId, `${caption}\n\n📎 Proof: ${photoUrl}`);
  }
}

async function notifyRecipients(chatIds, message, photoUrl) {
  const unique = [...new Set(chatIds.filter(Boolean).map(String))];
  await Promise.all(
    unique.map((chatId) => (photoUrl ? sendTelegramPhoto(chatId, photoUrl, message) : sendTelegramMessage(chatId, message)))
  );
}

function formatDriverOrderMessage(order) {
  const orderId = order._id.toString().slice(-6);
  const customerPhone = order.phone || order.userId?.phone || 'N/A';
  const customerName = order.userId?.name || 'Customer';
  const merchantName = order.merchantId?.name || 'Merchant';
  const merchantPhone = order.merchantId?.phone;
  const zoneKey = order.location?.zone;
  const zoneLabel = zoneKey ? getZoneName(zoneKey) : 'N/A';
  const address = order.location?.address || 'N/A';
  const items = order.items
    .map((i) => `• ${i.productName} (${i.quality}) x${i.quantity}`)
    .join('\n');
  const total = order.totalPrice + (order.deliveryFee || 0);

  let text =
    `📦 <b>Delivery Assigned — Order #${orderId}</b>\n\n` +
    `<b>Customer:</b> ${customerName}\n` +
    `<b>Phone:</b> ${customerPhone}\n` +
    `<b>Address:</b> ${address}\n` +
    `<b>Zone:</b> ${zoneLabel}\n` +
    `<b>Merchant:</b> ${merchantName}`;

  if (merchantPhone) {
    text += `\n<b>Merchant phone:</b> ${merchantPhone}`;
  }

  text +=
    `\n\n<b>Items:</b>\n${items}\n\n` +
    `<b>Order total:</b> ${order.totalPrice} ETB\n` +
    `<b>Delivery fee:</b> ${order.deliveryFee || 0} ETB\n` +
    `<b>Grand total:</b> ${total} ETB`;

  if (order.notes) {
    text += `\n<b>Notes:</b> ${order.notes}`;
  }

  return text;
}

function formatVerificationRecommendation(recommendation) {
  switch (recommendation) {
    case 'likely_real':
      return 'Likely real';
    case 'likely_fake':
      return 'Likely fake';
    default:
      return 'Uncertain';
  }
}

function formatPaymentVerificationAlert(payment) {
  const v = payment.verification || {};
  const paymentRef = payment._id.toString().slice(-6);
  const customerName = payment.userId?.name || 'Customer';

  if (v.status === 'failed') {
    return (
      `⚠️ <b>Payment Scan Failed</b> #${paymentRef}\n` +
      `Customer: ${customerName}\n` +
      `Amount: ${payment.totalAmount} ETB\n` +
      `Error: ${v.error || 'Unknown error'}\n\n` +
      `Review manually in Admin → Payments.`
    );
  }

  const failedChecks = (v.checks || []).filter((c) => !c.passed).slice(0, 4);
  const official = v.officialReceipt || {};
  let text =
    `🔍 <b>Official Receipt Check</b> #${paymentRef}\n\n` +
    `<b>Confidence:</b> ${v.confidence ?? 0}% — ${formatVerificationRecommendation(v.recommendation)}\n` +
    `<b>Customer:</b> ${customerName}\n` +
    `<b>Order total:</b> ${payment.totalAmount} ETB`;

  if (official.transactionId) {
    text += `\n<b>Transaction:</b> ${official.transactionId}`;
    if (official.receiptUrl) {
      text += `\n<b>Receipt:</b> ${official.receiptUrl}`;
    }
  }
  if (official.settledAmount != null) {
    text += `\n<b>Settled:</b> ${official.settledAmount} ETB`;
  }
  if (official.transactionStatus) {
    text += `\n<b>Status:</b> ${official.transactionStatus}`;
  }
  if (official.creditedPartyName) {
    text += `\n<b>Credited to:</b> ${official.creditedPartyName}`;
  }

  if (failedChecks.length) {
    text += `\n\n<b>Failed checks:</b>`;
    for (const check of failedChecks) {
      text += `\n• ${check.label}`;
    }
  }

  if (official.fetchError) {
    text += `\n\n⚠️ ${official.fetchError}`;
  }

  if (payment.status === 'approved' && payment.autoApproved) {
    text += `\n\n✅ <b>Auto-approved</b> — official receipt passed at ${v.confidence ?? 0}%. Orders released to drivers.`;
  } else {
    text += `\n\nYou decide — open Admin → Payments to approve or reject.`;
  }
  return text;
}

function formatPaymentUploadedAlert(payment) {
  const user = payment.userId;
  const customerName = user?.name || 'Customer';
  const customerPhone = user?.phone || 'N/A';
  const orderRefs = (payment.orderIds || [])
    .map((o) => {
      const id = o?._id ? o._id.toString().slice(-6) : String(o).slice(-6);
      return `#${id}`;
    })
    .join(', ');

  let text =
    `💳 <b>Payment Uploaded</b>\n\n` +
    `<b>Customer:</b> ${customerName}\n` +
    `<b>Phone:</b> ${customerPhone}\n` +
    `<b>Amount:</b> ${payment.totalAmount} ETB\n` +
    `<b>Orders:</b> ${orderRefs || '—'}`;

  if (payment.telebirrReference) {
    text += `\n<b>Telebirr ref:</b> ${payment.telebirrReference}`;
  }

  text += `\n\n⏳ <b>Pending</b> — open Admin → Payments to approve or reject.`;

  return text;
}

function paymentRecipientChatIds(payment) {
  const chatIds = [];
  if (env.telegram.adminChatId) chatIds.push(String(env.telegram.adminChatId));

  for (const order of payment.orderIds || []) {
    const merchant = order?.merchantId;
    if (merchant?.telegramId) chatIds.push(String(merchant.telegramId));
  }

  return chatIds;
}

function formatNewOrderAlert(order) {
  const orderId = order._id.toString().slice(-6);
  const customerName = order.userId?.name || 'Customer';
  const customerPhone = order.phone || order.userId?.phone || 'N/A';
  const zoneKey = order.location?.zone;
  const zoneLabel = zoneKey ? getZoneName(zoneKey) : 'N/A';
  const address = order.location?.address || 'N/A';
  const items = order.items
    .map((i) => `• ${i.productName} (${i.quality}) x${i.quantity}`)
    .join('\n');
  const total = order.totalPrice + (order.deliveryFee || 0);

  let text =
    `🛒 <b>New Order #${orderId}</b>\n\n` +
    `<b>Customer:</b> ${customerName}\n` +
    `<b>Phone:</b> ${customerPhone}\n` +
    `<b>Address:</b> ${address}\n` +
    `<b>Zone:</b> ${zoneLabel}\n\n` +
    `<b>Items:</b>\n${items}\n\n` +
    `<b>Total:</b> ${total} ETB`;

  if (order.notes) {
    text += `\n<b>Notes:</b> ${order.notes}`;
  }

  text += `\n\n⏳ <b>Pending</b> — open Admin or Merchant → Orders to accept or reject.`;

  return text;
}

export const notifications = {
  async newOrder(merchant, order) {
    const message = formatNewOrderAlert(order);
    const adminChatId = env.telegram.adminChatId ? String(env.telegram.adminChatId) : null;
    const merchantChatId = merchant?.telegramId ? String(merchant.telegramId) : null;

    if (merchantChatId) {
      await sendTelegramMessage(merchantChatId, message);
    }
    if (adminChatId && adminChatId !== merchantChatId) {
      await sendTelegramMessage(adminChatId, message);
    }
  },

  async orderAccepted(user, order) {
    if (!user.telegramId) return;
    const deliveryFee = order.deliveryFee || 0;
    const total = order.totalPrice + deliveryFee;
    const totalLine =
      deliveryFee > 0
        ? `<b>Total to pay: ${total} ETB</b> (${order.totalPrice} + ${deliveryFee} delivery)`
        : `<b>Total to pay: ${total} ETB</b>`;

    await sendTelegramMessage(
      user.telegramId,
      `✅ <b>Order Accepted!</b>\n` +
        `Order #${order._id.toString().slice(-6)} has been accepted.\n` +
        `Please upload your Telebirr payment proof.\n\n` +
        `<b>Telebirr Account: ${env.telebirrAccount}</b>\n` +
        totalLine
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
    const message = formatPaymentUploadedAlert(payment);
    const chatIds = paymentRecipientChatIds(payment);
    if (chatIds.length === 0) return;
    await notifyRecipients(chatIds, message, payment.proof);
  },

  async paymentVerificationComplete(payment) {
    const message = formatPaymentVerificationAlert(payment);
    const chatIds = paymentRecipientChatIds(payment);
    if (chatIds.length === 0) return;
    await notifyRecipients(chatIds, message);
  },

  async paymentDuplicateViolation(payment, duplicateOfPaymentId) {
    const paymentRef = payment._id.toString().slice(-6);
    const originalRef = duplicateOfPaymentId
      ? duplicateOfPaymentId.toString().slice(-6)
      : 'unknown';
    const customerName = payment.userId?.name || 'Customer';

    const message =
      `🚨 <b>Duplicate Receipt Blocked</b> #${paymentRef}\n\n` +
      `<b>Customer:</b> ${customerName}\n` +
      `<b>Amount:</b> ${payment.totalAmount} ETB\n` +
      `Same Telebirr receipt/transaction already used on payment #${originalRef}.\n` +
      `One transaction = one payment only.\n\n` +
      `Payment was rejected and violation recorded.`;

    let chatIds = paymentRecipientChatIds(payment);
    if (chatIds.length === 0 && env.telegram.adminChatId) {
      chatIds = [String(env.telegram.adminChatId)];
    }
    if (chatIds.length === 0) return;
    await notifyRecipients(chatIds, message);
  },

  async paymentApproved(user, payment) {
    if (!user.telegramId) return;
    const deliveryNote = payment.autoApproved
      ? 'Your order is now available for delivery — a driver will claim it soon.'
      : 'Your order is being prepared for delivery.';
    await sendTelegramMessage(
      user.telegramId,
      `✅ <b>Payment Approved!</b>\n` +
        `Your payment of ${payment.totalAmount} ETB has been confirmed.\n` +
        deliveryNote
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
    if (user?.telegramId) {
      await sendTelegramMessage(
        user.telegramId,
        `🚗 <b>Driver Assigned!</b>\n` +
          `Order #${order._id.toString().slice(-6)} was claimed by ${driver.name}.\n` +
          `Your delivery will start soon.`
      );
    }
    await this.driverAssigned(driver, order);
  },

  async driverAssigned(driver, order) {
    if (!driver?.telegramId) return;
    await sendTelegramMessage(driver.telegramId, formatDriverOrderMessage(order));
  },
};
