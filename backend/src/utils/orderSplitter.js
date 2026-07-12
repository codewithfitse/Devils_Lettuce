import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';
import * as areaService from '../services/areaService.js';

export function getAllowedZoneKeys(product) {
  if (product?.deliveryOptions?.length) {
    return product.deliveryOptions.map((o) => o.key);
  }
  return product?.deliveryZones?.length ? product.deliveryZones : null;
}

export async function getDeliveryFeeForArea(product, areaKey, sharedFee) {
  const allowed = getAllowedZoneKeys(product);
  if (allowed && !allowed.includes(areaKey)) {
    return 0;
  }
  return sharedFee;
}

async function assertProductAllowsArea(product, areaKey) {
  if (!areaKey) return;
  const allowed = getAllowedZoneKeys(product);
  if (allowed && !allowed.includes(areaKey)) {
    const area = await areaService.getAreaByKey(areaKey);
    const label = area?.name || areaKey;
    throw new AppError(
      `"${product.name}" is not delivered to ${label}. Remove it from your cart or pick another area.`,
      400
    );
  }
}

/**
 * Splits cart items by merchant and validates stock/pricing.
 * @param {Array} cartItems - [{ productId, variantId, quantity }]
 * @param {string} [areaKey] - delivery area key (stored as location.zone)
 */
export async function splitCartByMerchant(cartItems, areaKey) {
  const merchantMap = new Map();
  const area = areaKey ? await areaService.getAreaByKey(areaKey) : null;
  const sharedFee = area?.price ?? 0;

  for (const item of cartItems) {
    const product = await Product.findById(item.productId).populate('ownerId', 'name');
    if (!product || !product.isActive || !product.isApproved) {
      throw new AppError(`Product ${item.productId} is not available`, 400);
    }

    await assertProductAllowsArea(product, areaKey);

    const variant = product.variants.id(item.variantId);
    if (!variant) {
      throw new AppError(`Variant not found for product ${product.name}`, 400);
    }
    if (variant.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name} (${variant.quality})`, 400);
    }

    const merchantId = product.ownerId._id.toString();
    const deliveryFeeForZone = await getDeliveryFeeForArea(product, areaKey, sharedFee);

    const orderItem = {
      productId: product._id,
      productName: product.name,
      quality: variant.quality,
      quantity: item.quantity,
      price: variant.price,
      unit: variant.unit,
      deliveryFeeForZone,
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

export async function applyDeliveryFee(merchantGroups, _areaKey) {
  return merchantGroups.map((group) => ({
    ...group,
    deliveryFee: Math.max(
      0,
      ...(group.items?.map((i) => Number(i.deliveryFeeForZone) || 0) || [0])
    ),
    grandTotal: group.totalPrice + Math.max(
      0,
      ...(group.items?.map((i) => Number(i.deliveryFeeForZone) || 0) || [0])
    ),
  }));
}

/** @deprecated use getDeliveryFeeForArea */
export function getDeliveryFeeForProductAndZone(product, zone, sharedFee) {
  const allowed = getAllowedZoneKeys(product);
  if (allowed && !allowed.includes(zone)) return 0;
  return sharedFee;
}
