import * as productService from '../services/productService.js';
import { uploadImage as uploadToCloudinary } from '../services/cloudinaryService.js';

function parseProductBody(body) {
  const data = { ...body };
  if (typeof data.variants === 'string') {
    try {
      data.variants = JSON.parse(data.variants);
    } catch {
      data.variants = [];
    }
  }
  if (typeof data.deliveryZones === 'string') {
    try {
      data.deliveryZones = JSON.parse(data.deliveryZones);
    } catch {
      data.deliveryZones = [];
    }
  }
  if (data.price !== undefined) data.price = Number(data.price);
  return data;
}

export async function getProducts(req, res) {
  const products = await productService.getProducts({
    ...req.query,
    approvedOnly: req.query.approvedOnly !== 'false',
    includeInactive: req.query.includeInactive === 'true',
  });
  res.json({ success: true, data: products });
}

export async function getProduct(req, res) {
  const product = await productService.getProductById(req.params.id);
  res.json({ success: true, data: product });
}

export async function createProduct(req, res) {
  const body = parseProductBody(req.body);
  let image = body.image;
  if (req.file) {
    image = await uploadToCloudinary(req.file);
  }
  const product = await productService.createProduct({ ...body, image }, req.user);
  res.status(201).json({ success: true, data: product });
}

export async function updateProduct(req, res) {
  const body = parseProductBody(req.body);
  let image = body.image;
  if (req.file) {
    image = await uploadToCloudinary(req.file);
  }
  const product = await productService.updateProduct(
    req.params.id,
    { ...body, ...(image && { image }) },
    req.user
  );
  res.json({ success: true, data: product });
}

export async function deleteProduct(req, res) {
  const result = await productService.deleteProduct(req.params.id, req.user);
  res.json({ success: true, data: result });
}

export async function approveProduct(req, res) {
  const product = await productService.approveProduct(req.params.id);
  res.json({ success: true, data: product });
}

export async function getMyProducts(req, res) {
  const products = await productService.getOwnerProducts(req.user._id);
  res.json({ success: true, data: products });
}
