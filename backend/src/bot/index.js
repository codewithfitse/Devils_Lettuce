import { Telegraf, session, Markup } from 'telegraf';
import env from '../config/env.js';
import { setBotInstance } from '../utils/notifications.js';
import { t } from './i18n.js';
import { authTelegram, getProducts, createOrders, getOrders, getDeliveryZones, uploadPayment, getFileUrl } from './api.js';
import {
  languageKeyboard,
  mainMenuKeyboard,
  productListKeyboard,
  variantKeyboard,
  quantityKeyboard,
  cartKeyboard,
  zoneKeyboard,
} from './keyboards.js';
import {
  findProduct,
  productCaption,
  deleteMessageSafe,
  sendProductDetail,
  updateMessage,
  replaceWithProductDetail,
} from './helpers.js';

let bot = null;

const defaultSession = () => ({
  lang: 'en',
  token: null,
  user: null,
  cart: [],
  checkout: null,
  customQty: null,
  awaitingPayment: false,
});

export function startBot() {
  if (!env.telegram.botToken) {
    console.warn('Telegram bot token not set, skipping bot startup');
    return;
  }

  bot = new Telegraf(env.telegram.botToken);
  setBotInstance(bot);

  bot.catch((err, ctx) => {
    console.error('[Telegram] Handler error:', err.message);
    const lang = ctx.session?.lang || 'en';
    ctx.reply(t(lang, 'error')).catch(() => {});
  });

  bot.use(session({ defaultSession }));

  // /start
  bot.start(async (ctx) => {
    if (!ctx.session.lang || ctx.session.lang === 'en' && !ctx.session.user) {
      await ctx.reply(t('en', 'chooseLanguage'), languageKeyboard());
      return;
    }
    await handleAuth(ctx);
    await ctx.reply(t(ctx.session.lang, 'welcome'), { parse_mode: 'HTML' });
    await ctx.reply(t(ctx.session.lang, 'mainMenu'), mainMenuKeyboard(ctx.session.lang));
  });

  // Language selection
  bot.action(/^lang_(en|am)$/, async (ctx) => {
    ctx.session.lang = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(ctx.session.lang, 'languageSet'));
    try {
      await handleAuth(ctx);
      await ctx.reply(t(ctx.session.lang, 'welcome'), { parse_mode: 'HTML' });
      await ctx.reply(t(ctx.session.lang, 'mainMenu'), mainMenuKeyboard(ctx.session.lang));
    } catch (error) {
      console.error('[Telegram] Auth failed:', error.message);
      await ctx.reply(`${t(ctx.session.lang, 'error')}\n${error.message}`);
    }
  });

  // Browse products
  bot.hears(/Browse Products|ምርቶች ይመልከቱ/, async (ctx) => {
    await showProducts(ctx);
  });

  bot.action('browse_products', async (ctx) => {
    await ctx.answerCbQuery();
    await showProducts(ctx, true);
  });

  async function showProducts(ctx, edit = false) {
    const lang = ctx.session.lang;
    try {
      const products = await getProducts();
      if (!products.length) {
        const msg = t(lang, 'noProducts');
        if (edit) {
          const msg0 = ctx.callbackQuery?.message;
          if (msg0?.photo?.length) {
            await deleteMessageSafe(ctx);
            return ctx.reply(msg);
          }
          return ctx.editMessageText(msg);
        }
        return ctx.reply(msg);
      }

      const text = t(lang, 'selectProduct');
      const kb = productListKeyboard(products);

      if (edit) {
        const msg0 = ctx.callbackQuery?.message;
        if (msg0?.photo?.length) {
          await deleteMessageSafe(ctx);
          return ctx.reply(text, kb);
        }
        return ctx.editMessageText(text, kb);
      }

      return ctx.reply(text, kb);
    } catch {
      ctx.reply(t(lang, 'error'));
    }
  }

  // Product selection — show photo + variant picker
  bot.action(/^product_(.+)$/, async (ctx) => {
    const productId = ctx.match[1];
    const lang = ctx.session.lang;
    await ctx.answerCbQuery();
    try {
      const products = await getProducts();
      const product = findProduct(products, productId);
      if (!product) {
        return updateMessage(ctx, t(lang, 'error'), Markup.inlineKeyboard([]));
      }
      await replaceWithProductDetail(ctx, product, lang, variantKeyboard(product, lang));
    } catch {
      ctx.reply(t(lang, 'error'));
    }
  });

  // Variant selection → quantity
  bot.action(/^variant_(.+)_([a-f0-9]+)$/, async (ctx) => {
    const lang = ctx.session.lang;
    await ctx.answerCbQuery();
    const [, productId, variantId] = ctx.match;
    const products = await getProducts();
    const product = findProduct(products, productId);
    const variant = product?.variants?.find((v) => String(v._id) === variantId);
    const label = variant
      ? `${variant.quality} — ${variant.price} ${t(lang, 'etb')}/${variant.unit}`
      : '';
    const text = `${t(lang, 'quantity')}${label ? `\n<b>${label}</b>` : ''}`;
    await updateMessage(ctx, text, quantityKeyboard(productId, variantId, lang));
  });

  // Add to cart
  bot.action(/^qty_(.+)_([a-f0-9]+)_(\d+)$/, async (ctx) => {
    const [, productId, variantId, qty] = ctx.match;
    const lang = ctx.session.lang;
    await ctx.answerCbQuery();

    const existing = ctx.session.cart.find(
      (i) => i.productId === productId && i.variantId === variantId
    );
    if (existing) {
      existing.quantity += parseInt(qty, 10);
    } else {
      ctx.session.cart.push({
        productId,
        variantId,
        quantity: parseInt(qty, 10),
      });
    }

    await updateMessage(ctx, `✅ ${t(lang, 'addedToCart')}`, Markup.inlineKeyboard([]));
    await ctx.reply(t(lang, 'mainMenu'), mainMenuKeyboard(lang));
  });

  // Custom quantity: prompt user to type any number (e.g. 20)
  bot.action(/^qty_custom_(.+)_([a-f0-9]+)$/, async (ctx) => {
    const [, productId, variantId] = ctx.match;
    const lang = ctx.session.lang;
    await ctx.answerCbQuery();
    ctx.session.customQty = { productId, variantId };
    await updateMessage(ctx, t(lang, 'enterCustomQuantity'), Markup.inlineKeyboard([]));
  });

  // Cart
  bot.hears(/My Cart|ጋሪዬ/, async (ctx) => {
    await showCart(ctx);
  });

  async function showCart(ctx) {
    const lang = ctx.session.lang;
    const cart = ctx.session.cart;

    if (!cart.length) {
      return ctx.reply(t(lang, 'cartEmpty'));
    }

    try {
      const products = await getProducts();
      let text = `${t(lang, 'cartTitle')}\n\n`;
      let total = 0;

      for (const item of cart) {
        const product = findProduct(products, item.productId);
        const variant = product?.variants?.find((v) => String(v._id) === String(item.variantId));
        if (product && variant) {
          const lineTotal = variant.price * item.quantity;
          total += lineTotal;
          text += `• ${product.name} (${variant.quality}) x${item.quantity} = ${lineTotal} ETB\n`;
        }
      }

      text += `\n<b>${t(lang, 'total')}: ${total} ETB</b>`;
      await ctx.reply(text, { parse_mode: 'HTML', ...cartKeyboard(lang) });
    } catch {
      ctx.reply(t(lang, 'error'));
    }
  }

  bot.action('cart_clear', async (ctx) => {
    ctx.session.cart = [];
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(ctx.session.lang, 'cartEmpty'));
  });

  // Checkout flow
  bot.action('cart_checkout', async (ctx) => {
    const lang = ctx.session.lang;
    if (!ctx.session.cart.length) {
      return ctx.answerCbQuery(t(lang, 'cartEmpty'));
    }
    await ctx.answerCbQuery();
    ctx.session.checkout = { step: 'phone' };
    await ctx.editMessageText(t(lang, 'enterPhone'));
  });

  bot.on('text', async (ctx, next) => {
    const lang = ctx.session.lang;
    const text = ctx.message.text;
    const checkout = ctx.session.checkout;

    if (ctx.session.customQty) {
      const qty = parseInt(text, 10);
      if (!Number.isInteger(qty) || qty <= 0) {
        return ctx.reply(t(lang, 'invalidQuantity'));
      }

      const { productId, variantId } = ctx.session.customQty;
      ctx.session.customQty = null;

      const existing = ctx.session.cart.find(
        (i) => i.productId === productId && i.variantId === variantId
      );
      if (existing) {
        existing.quantity += qty;
      } else {
        ctx.session.cart.push({
          productId,
          variantId,
          quantity: qty,
        });
      }

      await ctx.reply(`✅ ${t(lang, 'addedToCart')}`);
      return ctx.reply(t(lang, 'mainMenu'), mainMenuKeyboard(lang));
    }

    if (checkout?.step === 'phone') {
      ctx.session.checkout.phone = text;
      ctx.session.checkout.step = 'address';
      return ctx.reply(t(lang, 'enterAddress'));
    }

    if (checkout?.step === 'address') {
      ctx.session.checkout.address = text;
      ctx.session.checkout.step = 'zone';
      try {
        const productIds = [...new Set(ctx.session.cart.map((i) => i.productId))];
        const zones = await getDeliveryZones(productIds);
        if (!zones.length) {
          ctx.session.checkout = null;
          return ctx.reply(t(lang, 'noDeliveryZones'));
        }
        return ctx.reply(t(lang, 'selectZone'), zoneKeyboard(zones, lang));
      } catch {
        return ctx.reply(t(lang, 'error'));
      }
    }

    return next();
  });

  // Support shared location (Telegram location message)
  bot.on('location', async (ctx, next) => {
    const lang = ctx.session.lang;
    const checkout = ctx.session.checkout;

    if (checkout?.step !== 'address') {
      return next();
    }

    const loc = ctx.message.location;
    const latitude = loc?.latitude;
    const longitude = loc?.longitude;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return ctx.reply(t(lang, 'error'));
    }

    ctx.session.checkout.address = 'Shared location';
    ctx.session.checkout.coordinates = { lat: latitude, lng: longitude };
    ctx.session.checkout.step = 'zone';

    try {
      const productIds = [...new Set(ctx.session.cart.map((i) => i.productId))];
      const zones = await getDeliveryZones(productIds);
      if (!zones.length) {
        ctx.session.checkout = null;
        return ctx.reply(t(lang, 'noDeliveryZones'));
      }
      return ctx.reply(t(lang, 'selectZone'), zoneKeyboard(zones, lang));
    } catch {
      return ctx.reply(t(lang, 'error'));
    }
  });

  bot.action(/^zone_(.+)$/, async (ctx) => {
    const zone = ctx.match[1];
    const lang = ctx.session.lang;
    const checkout = ctx.session.checkout;
    await ctx.answerCbQuery();

    if (!checkout || !ctx.session.cart.length) {
      return ctx.editMessageText(t(lang, 'error'));
    }

    try {
      await handleAuth(ctx);
      const orders = await createOrders(ctx.session.token, {
        cartItems: ctx.session.cart,
        phone: checkout.phone,
        location: {
          address: checkout.address,
          zone,
          ...(checkout.coordinates
            ? { coordinates: checkout.coordinates }
            : {}),
        },
      });

      const ids = orders.map((o) => o._id.toString().slice(-6)).join(', ');
      ctx.session.cart = [];
      ctx.session.checkout = null;

      await ctx.editMessageText(t(lang, 'orderPlaced', { ids }));
      await ctx.reply(t(lang, 'mainMenu'), mainMenuKeyboard(lang));
    } catch (error) {
      await ctx.editMessageText(`${t(lang, 'error')}\n${error.message}`);
    }
  });

  // My Orders
  bot.hears(/My Orders|ትዕዛዞቼ/, async (ctx) => {
    const lang = ctx.session.lang;
    try {
      await handleAuth(ctx);
      const orders = await getOrders(ctx.session.token);
      if (!orders.length) return ctx.reply(t(lang, 'noProducts'));

      for (const order of orders.slice(0, 10)) {
        await ctx.reply(
          t(lang, 'orderStatus', {
            id: order._id.toString().slice(-6),
            status: order.status,
            total: order.totalPrice + order.deliveryFee,
          })
        );
      }
    } catch {
      ctx.reply(t(lang, 'error'));
    }
  });

  // Payment upload
  bot.hears(/Upload Payment|ክፍያ ይላኩ/, async (ctx) => {
    const lang = ctx.session.lang;
    try {
      await handleAuth(ctx);
      const orders = await getOrders(ctx.session.token);
      const accepted = orders.filter((o) => o.status === 'accepted');

      if (!accepted.length) {
        return ctx.reply(t(lang, 'noAcceptedOrders'));
      }

      ctx.session.awaitingPayment = accepted.map((o) => o._id);
      await ctx.reply(
        `${t(lang, 'sendPaymentProof')}\n\n<b>${t(lang, 'telebirrAccount', { account: env.telebirrAccount })}</b>`,
        { parse_mode: 'HTML' }
      );
    } catch {
      ctx.reply(t(lang, 'error'));
    }
  });

  bot.on('photo', async (ctx) => {
    if (!ctx.session.awaitingPayment?.length) return;

    const lang = ctx.session.lang;
    try {
      await handleAuth(ctx);
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const proofUrl = await getFileUrl(ctx, photo.file_id);

      await uploadPayment(ctx.session.token, ctx.session.awaitingPayment, proofUrl);
      ctx.session.awaitingPayment = false;
      await ctx.reply(t(lang, 'paymentUploaded'));
    } catch (error) {
      await ctx.reply(`${t(lang, 'error')}\n${error.message}`);
    }
  });

  // Settings / back
  bot.hears(/Settings|ቅንብሮች/, async (ctx) => {
    await ctx.reply(t(ctx.session.lang, 'chooseLanguage'), languageKeyboard());
  });

  bot.action('back_main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(t(ctx.session.lang, 'mainMenu'), mainMenuKeyboard(ctx.session.lang));
  });

  launchWithRetry(bot);

  return bot;
}

function launchWithRetry(bot, attempt = 0) {
  const isProduction = env.nodeEnv === 'production';
  const delayMs = Math.min(60_000, 10_000 * (attempt + 1));

  bot.telegram.deleteWebhook({ drop_pending_updates: false }).finally(() => {
    bot
      .launch()
      .then(() => {
        console.log('Telegram bot polling started');
      })
      .catch((err) => {
        if (err.response?.error_code === 409) {
          if (isProduction) {
            console.warn(
              `[Telegram] 409 — another instance is polling. Retrying in ${delayMs / 1000}s…`
            );
            setTimeout(() => launchWithRetry(bot, attempt + 1), delayMs);
            return;
          }
          console.warn(
            '[Telegram] 409 Conflict — Render (or another dev server) is polling this token.\n' +
              '  • Leave ENABLE_TELEGRAM_BOT=false locally and use Render for the bot, OR\n' +
              '  • Pause Render and set ENABLE_TELEGRAM_BOT=true, OR\n' +
              '  • Use TELEGRAM_BOT_TOKEN_LOCAL with a separate @BotFather test bot'
          );
        } else {
          console.error('[Telegram] Failed to start:', err.message);
          if (isProduction) {
            setTimeout(() => launchWithRetry(bot, attempt + 1), delayMs);
          }
        }
      });
  });
}

export async function stopBot() {
  if (bot) {
    await bot.stop('SIGTERM');
    bot = null;
  }
}

async function handleAuth(ctx) {
  const { id, first_name, last_name } = ctx.from;
  const name = [first_name, last_name].filter(Boolean).join(' ');
  const result = await authTelegram(id, name, ctx.session.lang);
  ctx.session.token = result.token;
  ctx.session.user = result.user;
}

export function getBot() {
  return bot;
}
