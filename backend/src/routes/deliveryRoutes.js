import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireDeliveryAccess } from '../middleware/rbac.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import * as deliveryController from '../controllers/deliveryController.js';
import * as deliveryPricingController from '../controllers/deliveryPricingController.js';

const router = Router();

router.get('/zones', asyncHandler(deliveryController.getDeliveryZones));
router.get('/estimate', asyncHandler(deliveryController.estimateFee));

router.use(authenticate);

router.get('/pricing', requireSuperAdmin, asyncHandler(deliveryPricingController.getDeliveryPricing));
router.put('/pricing', requireSuperAdmin, asyncHandler(deliveryPricingController.updateDeliveryPricing));

router.get('/available', requireDeliveryAccess(), asyncHandler(deliveryController.getAvailableOrders));
router.get('/mine', requireDeliveryAccess(), asyncHandler(deliveryController.getMyDeliveries));
router.get('/completed', requireDeliveryAccess(), asyncHandler(deliveryController.getCompletedDeliveries));
router.patch('/:orderId/start', requireDeliveryAccess(), asyncHandler(deliveryController.startDelivery));
router.patch('/:orderId/complete', requireDeliveryAccess(), asyncHandler(deliveryController.completeDelivery));

export default router;
