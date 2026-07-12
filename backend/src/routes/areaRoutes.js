import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import * as areaController from '../controllers/areaController.js';

const router = Router();

router.get('/', asyncHandler(areaController.getAreas));
router.post('/', authenticate, requireSuperAdmin, asyncHandler(areaController.createArea));
router.put('/:id', authenticate, requireSuperAdmin, asyncHandler(areaController.updateArea));
router.delete('/:id', authenticate, requireSuperAdmin, asyncHandler(areaController.deleteArea));

export default router;
