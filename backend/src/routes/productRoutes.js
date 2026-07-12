import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireSuperAdmin, requirePermission } from '../middleware/rbac.js';
import { uploadImage } from '../middleware/upload.js';
import * as productController from '../controllers/productController.js';

const router = Router();

router.get('/', optionalAuth, asyncHandler(productController.getProducts));
router.get('/mine', authenticate, requirePermission('canSell'), asyncHandler(productController.getMyProducts));
router.get('/:id', optionalAuth, asyncHandler(productController.getProduct));

router.post(
  '/',
  authenticate,
  requirePermission('canSell'),
  uploadImage.single('image'),
  asyncHandler(productController.createProduct)
);

router.patch(
  '/:id',
  authenticate,
  uploadImage.single('image'),
  asyncHandler(productController.updateProduct)
);

router.delete('/:id', authenticate, asyncHandler(productController.deleteProduct));
router.patch('/:id/approve', authenticate, requireSuperAdmin, asyncHandler(productController.approveProduct));
router.post('/:id/announce', authenticate, requireSuperAdmin, asyncHandler(productController.announceProduct));

export default router;
