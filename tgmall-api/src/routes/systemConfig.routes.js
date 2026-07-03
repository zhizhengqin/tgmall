// 系统配置路由 — 平台设置 + 管理员管理（仅管理员可访问）
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as ctrl from '../controllers/systemConfig.controller.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

// 平台设置
router.get('/platform-settings', ctrl.getPlatformSettings);
router.put('/platform-settings', ctrl.updatePlatformSettings);

// 管理员账号管理
router.get('/admins', ctrl.listAdminUsers);
router.post('/admins', ctrl.createAdminUser);
router.put('/admins/:id/reset-password', ctrl.resetAdminPassword);
router.post('/admins/:id/toggle', ctrl.toggleAdminStatus);
router.delete('/admins/:id', ctrl.deleteAdminUser);

export default router;
