import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.use(authenticate);

router.get('/merchants', asyncHandler(userController.getMerchants));
router.get('/drivers', requireSuperAdmin, asyncHandler(userController.getDrivers));
router.get('/', requireSuperAdmin, asyncHandler(userController.getUsers));
router.get('/:id', asyncHandler(userController.getUser));
router.patch('/:id', asyncHandler(userController.updateUser));
router.delete('/:id', requireSuperAdmin, asyncHandler(userController.deleteUser));

export default router;
