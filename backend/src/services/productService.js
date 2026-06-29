import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateZoneKeys } from '../utils/deliveryPricing.js';

function normalizeDeliveryZones(data) {
  if (data.deliveryZones === undefined) return data;
  if (typeof data.deliveryZones === 'string') {
    try {
      data.deliveryZones = JSON.parse(data.deliveryZones);
    } catch {
      data.deliveryZones = [];
    }
  }
  const err = validateZoneKeys(data.deliveryZones);
  if (err) throw new AppError(err, 400);
  return data;
}

export async function getProducts(filters = {}) {
  const query = {};

  if (filters.includeInactive !== true && filters.includeInactive !== 'true') {
    query.isActive = true;
  }

  if (filters.approvedOnly !== false && filters.approvedOnly !== 'false') {
    query.isApproved = true;
  }
  if (filters.featured) query.isFeatured = true;
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.search) {
    query.name = { $regex: filters.search, $options: 'i' };
  }

  return Product.find(query)
    .populate('ownerId', 'name phone')
    .sort({ isFeatured: -1, createdAt: -1 });
}

export async function getOwnerProducts(ownerId) {
  return Product.find({ ownerId })
    .populate('ownerId', 'name phone')
    .sort({ createdAt: -1 });
}

export async function getProductById(id) {
  const product = await Product.findById(id).populate('ownerId', 'name phone');
  if (!product || !product.isActive) throw new AppError('Product not found', 404);
  return product;
}

export async function createProduct(data, owner) {
  if (!owner.canManageProducts()) {
    throw new AppError('You do not have permission to sell products', 403);
  }

  normalizeDeliveryZones(data);

  const product = await Product.create({
    ...data,
    ownerId: owner._id,
    isApproved: owner.isSuperAdmin(),
  });

  return product.populate('ownerId', 'name phone');
}

export async function updateProduct(id, data, requester) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);

  if (!requester.isSuperAdmin() && product.ownerId.toString() !== requester._id.toString()) {
    throw new AppError('You can only modify your own products', 403);
  }

  const allowed = ['name', 'description', 'image', 'variants', 'isActive', 'deliveryZones'];
  const adminFields = ['isApproved', 'isFeatured'];

  for (const key of allowed) {
    if (data[key] !== undefined && key !== 'deliveryZones') {
      product[key] = data[key];
    }
  }

  if (requester.isSuperAdmin()) {
    for (const key of adminFields) {
      if (data[key] !== undefined) product[key] = data[key];
    }
  }

  if (data.deliveryZones !== undefined) {
    normalizeDeliveryZones(data);
    product.deliveryZones = data.deliveryZones;
  }

  if (!requester.isSuperAdmin()) {
    const edited = ['name', 'description', 'image', 'variants'].some((k) => data[k] !== undefined);
    if (edited) product.isApproved = false;
  }

  await product.save();
  return product.populate('ownerId', 'name phone');
}

export async function deleteProduct(id, requester) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);

  if (!requester.isSuperAdmin() && product.ownerId.toString() !== requester._id.toString()) {
    throw new AppError('You can only delete your own products', 403);
  }

  product.isActive = false;
  await product.save();
  return { message: 'Product deactivated' };
}

export async function approveProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  product.isApproved = true;
  await product.save();
  return product;
}

export async function updateStock(productId, quality, quantity) {
  const product = await Product.findById(productId);
  if (!product) return;

  const variant = product.variants.find((v) => v.quality === quality);
  if (variant) {
    variant.stock = Math.max(0, variant.stock - quantity);
    await product.save();
  }
}
