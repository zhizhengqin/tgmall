import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import addressRoutes from './address.routes.js';
import couponRoutes from './coupon.routes.js';
import paymentRoutes from './payment.routes.js';
import webhookRoutes from './webhook.routes.js';
import adminRouter from './admin.routes.js';
import cityRoutes from './city.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import feedbackRoutes from './feedback.routes.js';
import { adminRouter as shopConfigAdminRouter, publicRouter as shopConfigPublicRouter } from './shopConfig.routes.js';
import { adminRouter as flashDealAdminRouter, publicRouter as flashDealPublicRouter } from './flashDeal.routes.js';
import systemConfigRoutes from './systemConfig.routes.js';
import tagRoutes from './tag.routes.js';
import notificationRoutes from './notification.routes.js';
import uploadRoutes from './upload.routes.js';
import proxyRoutes from './proxy.routes.js';
import * as configCtrl from '../controllers/config.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 运行时配置（登录后可访问，前端据此判断演示模式）
router.get('/config', auth, configCtrl.get);

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/users/me/addresses', addressRoutes);
router.use('/coupons', couponRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRouter);
router.use('/admin', shopConfigAdminRouter);
router.use('/admin', flashDealAdminRouter);
router.use('/admin', systemConfigRoutes);
router.use('/admin', tagRoutes);
router.use('/admin/upload', uploadRoutes);
router.use('/cities', cityRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/notifications', notificationRoutes);
router.use('/proxy/image', proxyRoutes);
router.use('/', shopConfigPublicRouter);
router.use('/', flashDealPublicRouter);

// 后续 Sprint: upload

export default router;
