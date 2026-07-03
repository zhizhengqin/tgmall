// 限时专区路由 — admin CRUD + public 查询
import { Router } from 'express';
import * as ctrl from '../controllers/flashDeal.controller.js';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import { flashDealSchema } from '../validators/flashDeal.schema.js';

// 管理后台路由（需 auth + adminAuth）
export const adminRouter = Router();
adminRouter.use(auth, adminAuth);

adminRouter.get('/flash-deals', ctrl.listFlashDeals);
adminRouter.post('/flash-deals', validate(flashDealSchema), ctrl.createFlashDeal);
adminRouter.put('/flash-deals/:id', validate(flashDealSchema), ctrl.updateFlashDeal);
adminRouter.post('/flash-deals/:id/toggle', ctrl.toggleFlashDeal);

// 公开路由（无需登录）
export const publicRouter = Router();
publicRouter.get('/flash-deals', ctrl.listActiveFlashDeals);
