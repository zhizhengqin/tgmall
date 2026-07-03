// 管理员路由 — 看板、商品管理、订单管理、库存管理
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  merchantProductSchema,
  shipOrderSchema,
} from '../validators/merchant.schema.js';
import {
  couponSchema,
  couponUpdateSchema,
  couponStatusSchema,
} from '../validators/admin.schema.js';
import * as ctrl from '../controllers/merchant.controller.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import * as feedbackCtrl from '../controllers/feedback.controller.js';
import inventoryRouter from './inventory.routes.js';

const router = Router();

router.use(auth);
router.use(adminAuth);

// 数据看板 + 用户管理
router.get('/dashboard', adminCtrl.dashboard);
router.get('/merchants', adminCtrl.listMerchants);
router.get('/users', adminCtrl.listUsers);
router.get('/users/:id', adminCtrl.getUserDetail);
router.post('/users/:id/toggle', adminCtrl.toggleUserStatus);

// 商品管理（管理员直接管理所有商品）
router.get('/products', ctrl.listProducts);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', validate(merchantProductSchema), ctrl.createProduct);
router.put('/products/:id', validate(merchantProductSchema), ctrl.updateProduct);
router.post('/products/:id/toggle', ctrl.toggleProduct);

// 订单管理（管理员查看/处理所有订单）
router.get('/orders', ctrl.listOrders);
router.get('/orders/export/csv', ctrl.exportCsv);
router.post('/orders/:id/collect-cod', ctrl.collectCod);
router.get('/orders/:id', ctrl.getOrder);
router.post('/orders/:id/ship', validate(shipOrderSchema), ctrl.shipOrder);

// 库存管理
router.use(inventoryRouter);

// 反馈工单管理
router.get('/feedback', feedbackCtrl.list);
router.patch('/feedback/:id/resolve', feedbackCtrl.resolve);

// 优惠券管理
router.get('/coupons', adminCtrl.listCoupons);
router.post('/coupons', validate(couponSchema), adminCtrl.createCoupon);
router.put('/coupons/:id', validate(couponUpdateSchema), adminCtrl.updateCoupon);
router.patch('/coupons/:id/status', validate(couponStatusSchema), adminCtrl.toggleCouponStatus);

export default router;
