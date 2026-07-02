// 管理员路由 — 看板、商品管理、订单管理、库存管理
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { defaultMerchant } from '../middleware/defaultMerchant.js';
import { validate } from '../middleware/validate.js';
import {
  merchantProductSchema,
  shipOrderSchema,
} from '../validators/merchant.schema.js';
import * as ctrl from '../controllers/merchant.controller.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import inventoryRouter from './inventory.routes.js';

const router = Router();

router.use(auth);
router.use(adminAuth);

// 数据看板 + 用户管理
router.get('/dashboard', adminCtrl.dashboard);
router.get('/merchants', adminCtrl.listMerchants);
router.get('/users', adminCtrl.listUsers);

// 商品管理（管理员直接管理所有商品，归属到默认平台 merchant）
router.use(defaultMerchant);
router.get('/products', ctrl.listProducts);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', validate(merchantProductSchema), ctrl.createProduct);
router.put('/products/:id', validate(merchantProductSchema), ctrl.updateProduct);
router.post('/products/:id/toggle', ctrl.toggleProduct);

// 订单管理（管理员查看/处理所有订单）
router.get('/orders', ctrl.listOrders);
router.get('/orders/:id', ctrl.getOrder);
router.post('/orders/:id/ship', validate(shipOrderSchema), ctrl.shipOrder);

// 库存管理
router.use(inventoryRouter);

export default router;
