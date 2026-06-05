// 商家路由 — 入驻、登录、看板、商品、订单
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { merchantAuth } from '../middleware/merchantAuth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  registerMerchantSchema,
  merchantProductSchema,
  shipOrderSchema,
  rejectMerchantSchema,
} from '../validators/merchant.schema.js';
import { telegramLoginSchema } from '../validators/auth.schema.js';
import * as ctrl from '../controllers/merchant.controller.js';

// ============ 商家路由（需 merchant JWT） ============
const merchantRouter = Router();

// 商家入驻申请（用户 JWT 即可）
merchantRouter.post('/register', auth, validate(registerMerchantSchema), ctrl.register);

// 商家登录（获取 merchant 角色 Token）
merchantRouter.post('/login', validate(telegramLoginSchema), ctrl.login);

// 以下路由需要 merchant 角色鉴权
merchantRouter.use(merchantAuth);

// 商家数据看板
merchantRouter.get('/dashboard', ctrl.dashboard);

// 商家商品管理
merchantRouter.get('/products', ctrl.listProducts);
merchantRouter.post('/products', validate(merchantProductSchema), ctrl.createProduct);
merchantRouter.put('/products/:id', validate(merchantProductSchema), ctrl.updateProduct);
merchantRouter.post('/products/:id/toggle', ctrl.toggleProduct);

// 商家订单管理
merchantRouter.get('/orders', ctrl.listOrders);
merchantRouter.post('/orders/:id/ship', validate(shipOrderSchema), ctrl.shipOrder);

// ============ 管理员路由（需 admin 权限） ============
const adminRouter = Router();

adminRouter.use(auth);         // 先通过 JWT 鉴权
adminRouter.use(adminAuth);    // 再校验管理员身份

adminRouter.post('/merchants/:id/approve', ctrl.approve);
adminRouter.post('/merchants/:id/reject', validate(rejectMerchantSchema), ctrl.reject);

export { merchantRouter, adminRouter };
