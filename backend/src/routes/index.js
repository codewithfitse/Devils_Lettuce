import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import deliveryRoutes from './deliveryRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: "Devil's Lettuce API is running" });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/notifications', notificationRoutes);

export default router;
