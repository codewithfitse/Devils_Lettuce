import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

router.get('/subscribers', authenticate, requireSuperAdmin, asyncHandler(notificationController.getSubscriberCount));
router.post('/broadcast', authenticate, requireSuperAdmin, asyncHandler(notificationController.broadcastMessage));

export default router;
