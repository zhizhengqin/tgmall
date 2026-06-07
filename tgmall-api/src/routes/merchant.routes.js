// V2: 管理员路由 — 商品管理、订单管理、商家审核、用户管理
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { defaultMerchant } from '../middleware/defaultMerchant.js';
import { validate } from '../middleware/validate.js';
import {
  merchantProductSchema,
  shipOrderSchema,
  rejectMerchantSchema,
} from '../validators/merchant.schema.js';
import * as ctrl from '../controllers/merchant.controller.js';
import * as adminCtrl from '../controllers/admin.controller.js';

// ============ 管理员路由（需 admin JWT） ============
const adminRouter = Router();

adminRouter.use(auth);
adminRouter.use(adminAuth);

// 商家审核（保留兼容旧数据）
adminRouter.post('/merchants/:id/approve', ctrl.approve);
adminRouter.post('/merchants/:id/reject', validate(rejectMerchantSchema), ctrl.reject);

// 数据看板
adminRouter.get('/dashboard', adminCtrl.dashboard);
adminRouter.get('/merchants', adminCtrl.listMerchants);
adminRouter.get('/users', adminCtrl.listUsers);

// 商品管理（管理员直接管理所有商品，归属到默认平台 merchant）
adminRouter.use(defaultMerchant);
adminRouter.get('/products', ctrl.listProducts);
adminRouter.get('/products/:id', ctrl.getProduct);
adminRouter.post('/products', validate(merchantProductSchema), ctrl.createProduct);
adminRouter.put('/products/:id', validate(merchantProductSchema), ctrl.updateProduct);
adminRouter.post('/products/:id/toggle', ctrl.toggleProduct);

// 订单管理（管理员查看/处理所有订单）
adminRouter.get('/orders', ctrl.listOrders);
adminRouter.get('/orders/:id', ctrl.getOrder);
adminRouter.post('/orders/:id/ship', validate(shipOrderSchema), ctrl.shipOrder);

// 保留空的 merchantRouter 兼容现有引用
const merchantRouter = Router();
merchantRouter.use(auth);
merchantRouter.use(adminAuth);
merchantRouter.get('/dashboard', ctrl.dashboard);
merchantRouter.get('/products', ctrl.listProducts);
merchantRouter.get('/orders', ctrl.listOrders);

export { merchantRouter, adminRouter };
