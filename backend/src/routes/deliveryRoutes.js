import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireDeliveryAccess } from '../middleware/rbac.js';
import * as deliveryController from '../controllers/deliveryController.js';
import * as areaController from '../controllers/areaController.js';

const router = Router();

router.get('/zones', asyncHandler(deliveryController.getDeliveryZones));
router.get('/areas', asyncHandler(areaController.getAreas));
router.get('/zone-groups', asyncHandler(areaController.getZoneGroups));
router.get('/price', asyncHandler(areaController.getDeliveryPrice));
router.get('/estimate', asyncHandler(deliveryController.estimateFee));

router.use(authenticate);

router.get('/available', requireDeliveryAccess(), asyncHandler(deliveryController.getAvailableOrders));
router.get('/mine', requireDeliveryAccess(), asyncHandler(deliveryController.getMyDeliveries));
router.get('/completed', requireDeliveryAccess(), asyncHandler(deliveryController.getCompletedDeliveries));
router.patch('/:orderId/start', requireDeliveryAccess(), asyncHandler(deliveryController.startDelivery));
router.patch('/:orderId/complete', requireDeliveryAccess(), asyncHandler(deliveryController.completeDelivery));

export default router;
