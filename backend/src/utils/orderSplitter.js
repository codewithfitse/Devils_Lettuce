import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDeliveryFee, getAllZoneKeys, getZoneName, validateZoneKeys } from './deliveryPricing.js';

function assertProductAllowsZone(product, zone) {
  if (!zone) return;
  const allowed = product.deliveryZones?.length ? product.deliveryZones : getAllZoneKeys();
  if (!allowed.includes(zone)) {
    throw new AppError(
      `"${product.name}" is not delivered to ${getZoneName(zone)}. Remove it from your cart or pick another area.`,
      400
    );
  }
}

/**
 * Splits cart items by merchant and validates stock/pricing.
 * @param {Array} cartItems - [{ productId, variantId, quantity }]
 * @param {string} [zone] - delivery zone key
 */
export async function splitCartByMerchant(cartItems, zone) {
  const merchantMap = new Map();

  for (const item of cartItems) {
    const product = await Product.findById(item.productId).populate('ownerId', 'name');
    if (!product || !product.isActive || !product.isApproved) {
      throw new AppError(`Product ${item.productId} is not available`, 400);
    }

    assertProductAllowsZone(product, zone);

    const variant = product.variants.id(item.variantId);
    if (!variant) {
      throw new AppError(`Variant not found for product ${product.name}`, 400);
    }
    if (variant.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name} (${variant.quality})`, 400);
    }

    const merchantId = product.ownerId._id.toString();
    const orderItem = {
      productId: product._id,
      productName: product.name,
      quality: variant.quality,
      quantity: item.quantity,
      price: variant.price,
      unit: variant.unit,
    };

    if (!merchantMap.has(merchantId)) {
      merchantMap.set(merchantId, {
        merchantId: product.ownerId._id,
        merchantName: product.ownerId.name,
        items: [],
        totalPrice: 0,
      });
    }

    const group = merchantMap.get(merchantId);
    group.items.push(orderItem);
    group.totalPrice += variant.price * item.quantity;
  }

  return Array.from(merchantMap.values());
}

export function applyDeliveryFee(merchantGroups, zone) {
  const fee = getDeliveryFee(zone);
  return merchantGroups.map((group) => ({
    ...group,
    deliveryFee: fee,
    grandTotal: group.totalPrice + fee,
  }));
}
