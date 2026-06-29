import { Markup } from 'telegraf';
import { t } from './i18n.js';

export function languageKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🇬🇧 English', 'lang_en')],
    [Markup.button.callback('🇪🇹 አማርኛ', 'lang_am')],
  ]);
}

export function mainMenuKeyboard(lang) {
  return Markup.keyboard([
    [t(lang, 'browseProducts'), t(lang, 'myCart')],
    [t(lang, 'myOrders'), t(lang, 'uploadPayment')],
    [t(lang, 'settings')],
  ]).resize();
}

export function backKeyboard(lang) {
  return Markup.inlineKeyboard([[Markup.button.callback(t(lang, 'back'), 'back_main')]]);
}

export function cartKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'checkout'), 'cart_checkout')],
    [
      Markup.button.callback(t(lang, 'clearCart'), 'cart_clear'),
      Markup.button.callback(t(lang, 'back'), 'back_main'),
    ],
  ]);
}

export function productListKeyboard(products) {
  const buttons = products.slice(0, 10).map((p) => [
    Markup.button.callback(p.name, `product_${p._id}`),
  ]);
  buttons.push([Markup.button.callback('⬅️ Back', 'back_main')]);
  return Markup.inlineKeyboard(buttons);
}

export function variantKeyboard(product, lang) {
  const buttons = product.variants.map((v) => [
    Markup.button.callback(
      `${v.quality} - ${v.price} ${t(lang, 'etb')}/${v.unit} (${v.stock})`,
      `variant_${product._id}_${v._id}`
    ),
  ]);
  buttons.push([Markup.button.callback(t(lang, 'back'), 'browse_products')]);
  return Markup.inlineKeyboard(buttons);
}

export function zoneKeyboard(zones, lang) {
  const buttons = zones.map((z) => [
    Markup.button.callback(`${z.name} (+${z.fee} ETB)`, `zone_${z.key}`),
  ]);
  buttons.push([Markup.button.callback(t(lang, 'cancel'), 'back_main')]);
  return Markup.inlineKeyboard(buttons);
}

export function quantityKeyboard(productId, variantId, lang) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('1', `qty_${productId}_${variantId}_1`),
      Markup.button.callback('2', `qty_${productId}_${variantId}_2`),
      Markup.button.callback('5', `qty_${productId}_${variantId}_5`),
      Markup.button.callback('10', `qty_${productId}_${variantId}_10`),
    ],
    [Markup.button.callback(t(lang, 'back'), `product_${productId}`)],
  ]);
}
