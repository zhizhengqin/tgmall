// 系统配置路由 — 平台设置 + 管理员管理（仅管理员可访问）
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import { platformSettingsSchema } from '../validators/systemConfig.schema.js';
import {
  adminUserSchema,
  adminPasswordSchema,
} from '../validators/admin.schema.js';
import * as ctrl from '../controllers/systemConfig.controller.js';

const router = Router();
router.use(auth);
router.use(adminAuth);

// 平台设置
router.get('/platform-settings', ctrl.getPlatformSettings);
router.put('/platform-settings', validate(platformSettingsSchema), ctrl.updatePlatformSettings);

// 管理员账号管理
router.get('/admins', ctrl.listAdminUsers);
router.post('/admins', validate(adminUserSchema), ctrl.createAdminUser);
router.put('/admins/:id/reset-password', validate(adminPasswordSchema), ctrl.resetAdminPassword);
router.post('/admins/:id/toggle', ctrl.toggleAdminStatus);
router.delete('/admins/:id', ctrl.deleteAdminUser);

export default router;
