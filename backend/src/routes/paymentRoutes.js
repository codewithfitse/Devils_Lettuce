import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import { uploadPaymentProof } from '../middleware/upload.js';
import * as paymentController from '../controllers/paymentController.js';

const router = Router();

router.use(authenticate);

router.post('/', uploadPaymentProof, asyncHandler(paymentController.createPayment));
router.get('/', asyncHandler(paymentController.getPayments));
router.get('/:id', asyncHandler(paymentController.getPayment));
router.patch('/:id/approve', requireSuperAdmin, asyncHandler(paymentController.approvePayment));
router.patch('/:id/reject', requireSuperAdmin, asyncHandler(paymentController.rejectPayment));

export default router;
