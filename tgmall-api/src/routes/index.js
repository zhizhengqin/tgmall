import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';

const router = Router();

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);

// 后续 Sprint 逐步挂载: cart, orders, payments, merchants, coupons, upload, admin

export default router;
