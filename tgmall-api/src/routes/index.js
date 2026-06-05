import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import addressRoutes from './address.routes.js';
import couponRoutes from './coupon.routes.js';

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

// 后续 Sprint: payments, merchants, upload, admin

export default router;
