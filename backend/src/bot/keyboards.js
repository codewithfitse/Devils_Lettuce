import { Markup } from 'telegraf';
import { t } from './i18n.js';
import { formatAreaPrice } from '../utils/deliveryPricing.js';

export const AREAS_PAGE_SIZE = 8;

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
      `${v.quality} - ${v.price} ${t(lang, 'etb')}/${v.unit}`,
      `variant_${product._id}_${v._id}`
    ),
  ]);
  buttons.push([Markup.button.callback(t(lang, 'back'), 'browse_products')]);
  return Markup.inlineKeyboard(buttons);
}

export function paginatedAreaKeyboard(areas, lang, page = 0) {
  const sorted = [...areas].sort((a, b) => a.name.localeCompare(b.name));
  const totalPages = Math.max(1, Math.ceil(sorted.length / AREAS_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const slice = sorted.slice(safePage * AREAS_PAGE_SIZE, (safePage + 1) * AREAS_PAGE_SIZE);

  const buttons = slice.map((a) => [
    Markup.button.callback(`${a.name} — ${formatAreaPrice(a.price)}`, `area_${a.key}`),
  ]);

  const nav = [];
  if (safePage > 0) {
    nav.push(Markup.button.callback(`⬅️ ${t(lang, 'prevPage')}`, `areas_page_${safePage - 1}`));
  }
  if (safePage < totalPages - 1) {
    nav.push(Markup.button.callback(`${t(lang, 'nextPage')} ➡️`, `areas_page_${safePage + 1}`));
  }
  if (nav.length) buttons.push(nav);

  buttons.push([Markup.button.callback(t(lang, 'cancel'), 'back_main')]);

  return {
    keyboard: Markup.inlineKeyboard(buttons),
    page: safePage,
    totalPages,
  };
}

export function quantityKeyboard(productId, variantId, lang) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('1', `qty_${productId}_${variantId}_1`),
      Markup.button.callback('2', `qty_${productId}_${variantId}_2`),
      Markup.button.callback('5', `qty_${productId}_${variantId}_5`),
      Markup.button.callback('10', `qty_${productId}_${variantId}_10`),
    ],
    [Markup.button.callback(t(lang, 'customQuantity'), `qty_custom_${productId}_${variantId}`)],
    [Markup.button.callback(t(lang, 'back'), `product_${productId}`)],
  ]);
}
