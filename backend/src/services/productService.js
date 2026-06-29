import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getProducts(filters = {}) {
  const query = { isActive: true };

  if (filters.approvedOnly !== false) query.isApproved = true;
  if (filters.featured) query.isFeatured = true;
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.search) {
    query.name = { $regex: filters.search, $options: 'i' };
  }

  return Product.find(query)
    .populate('ownerId', 'name phone')
    .sort({ isFeatured: -1, createdAt: -1 });
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

  const allowed = ['name', 'description', 'image', 'variants', 'isActive'];
  const adminFields = ['isApproved', 'isFeatured'];

  for (const key of allowed) {
    if (data[key] !== undefined) product[key] = data[key];
  }

  if (requester.isSuperAdmin()) {
    for (const key of adminFields) {
      if (data[key] !== undefined) product[key] = data[key];
    }
  }

  if (!requester.isSuperAdmin() && data.isApproved !== undefined) {
    product.isApproved = false;
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
