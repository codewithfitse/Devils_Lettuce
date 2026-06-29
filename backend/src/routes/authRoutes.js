import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = Router();

const registerValidation = [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

router.post('/register', registerValidation, asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/telegram', asyncHandler(authController.telegramAuth));
router.get('/me', authenticate, asyncHandler(authController.getMe));

export default router;
