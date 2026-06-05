import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import addressRoutes from './address.routes.js';
import couponRoutes from './coupon.routes.js';
import paymentRoutes from './payment.routes.js';
import webhookRoutes from './webhook.routes.js';
import { merchantRouter, adminRouter } from './merchant.routes.js';

const router = Router();

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/users/me/addresses', addressRoutes);
router.use('/coupons', couponRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/merchants', merchantRouter);
router.use('/admin', adminRouter);

// 后续 Sprint: upload

export default router;
