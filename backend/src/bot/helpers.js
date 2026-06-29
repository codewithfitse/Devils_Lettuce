import { t } from './i18n.js';

export function findProduct(products, id) {
  return products.find((p) => String(p._id) === String(id));
}

export function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function productCaption(product, lang, extra = '') {
  const desc = product.description ? `\n${escapeHtml(product.description)}` : '';
  const tail = extra || t(lang, 'selectVariant');
  return `🍎 <b>${escapeHtml(product.name)}</b>${desc}\n\n${tail}`;
}

export async function deleteMessageSafe(ctx) {
  try {
    await ctx.deleteMessage();
  } catch {
    // message may already be gone
  }
}

/** Send product with photo (or text fallback) and inline keyboard */
export async function sendProductDetail(ctx, product, lang, keyboard) {
  const caption = productCaption(product, lang);
  const extra = { parse_mode: 'HTML', ...keyboard };

  if (product.image) {
    return ctx.replyWithPhoto(product.image, { caption, ...extra });
  }
  return ctx.reply(caption, extra);
}

/** Update existing message — works for photo captions or plain text */
export async function updateMessage(ctx, text, keyboard, { parse_mode = 'HTML' } = {}) {
  const extra = { parse_mode, ...(keyboard || {}) };
  const msg = ctx.callbackQuery?.message;

  if (msg?.photo?.length) {
    try {
      return await ctx.editMessageCaption(text, extra);
    } catch {
      if (keyboard?.reply_markup) {
        return ctx.editMessageReplyMarkup(keyboard.reply_markup);
      }
    }
  }

  return ctx.editMessageText(text, extra);
}

/** Replace current message with product detail (photo or text) */
export async function replaceWithProductDetail(ctx, product, lang, keyboard) {
  await deleteMessageSafe(ctx);
  return sendProductDetail(ctx, product, lang, keyboard);
}
