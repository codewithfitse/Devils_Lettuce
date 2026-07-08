import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';
import { getAllZoneKeys, getZoneName } from './deliveryPricing.js';
import { getFee } from '../services/deliveryPricingService.js';

export function getAllowedZoneKeys(product) {
  if (product?.deliveryOptions?.length) {
    return product.deliveryOptions.map((o) => o.key);
  }
  return product?.deliveryZones?.length ? product.deliveryZones : getAllZoneKeys();
}

export function getDeliveryFeeForProductAndZone(product, zone, sharedFee) {
  if (product?.deliveryOptions?.length) {
    return product.deliveryOptions.find((o) => o.key === zone)?.fee ?? sharedFee;
  }
  return sharedFee;
}

function assertProductAllowsZone(product, zone) {
  if (!zone) return;
  const allowed = getAllowedZoneKeys(product);
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
  const sharedFee = zone ? await getFee(zone) : 0;

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

    // Delivery fee for this specific product when shipping to `zone`.
    // - New-model product: use its deliveryOptions fee for the zone
    // - Legacy product: fall back to shared DeliveryZone fee
    const deliveryFeeForZone = getDeliveryFeeForProductAndZone(product, zone, sharedFee);

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

export async function applyDeliveryFee(merchantGroups, _zone) {
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
