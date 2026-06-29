import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireSuperAdmin, requireDeliveryAccess } from '../middleware/rbac.js';
import * as orderController from '../controllers/orderController.js';

const router = Router();

router.use(authenticate);

router.post('/', asyncHandler(orderController.createOrders));
router.get('/', asyncHandler(orderController.getOrders));
router.get('/merchant', requirePermission('canSell'), asyncHandler(orderController.getMerchantOrders));
router.get('/:id', asyncHandler(orderController.getOrder));
router.patch('/:id/accept', requirePermission('canSell'), asyncHandler(orderController.acceptOrder));
router.patch('/:id/reject', requirePermission('canSell'), asyncHandler(orderController.rejectOrder));
router.patch('/:id/make-available', requirePermission('canSell'), asyncHandler(orderController.makeAvailableForDelivery));
router.patch('/:id/claim', requirePermission('canDeliver'), asyncHandler(orderController.claimOrder));
router.patch('/:id/deliver-self', requireDeliveryAccess(), asyncHandler(orderController.deliverSelf));
router.patch('/:id/assign-driver', requireSuperAdmin, asyncHandler(orderController.assignDriver));

export default router;
