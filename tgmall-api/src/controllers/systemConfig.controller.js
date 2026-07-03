// 系统配置控制器 — 平台设置 + 管理员管理
import * as service from '../services/systemConfig.service.js';

// GET /admin/platform-settings
export async function getPlatformSettings(req, res, next) {
  try {
    const data = await service.getPlatformSettings();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// PUT /admin/platform-settings
export async function updatePlatformSettings(req, res, next) {
  try {
    const data = await service.updatePlatformSettings(req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// GET /admin/admins
export async function listAdminUsers(req, res, next) {
  try {
    const data = await service.listAdminUsers();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// POST /admin/admins
export async function createAdminUser(req, res, next) {
  try {
    const data = await service.createAdminUser(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

// PUT /admin/admins/:id/reset-password
export async function resetAdminPassword(req, res, next) {
  try {
    await service.resetAdminPassword(req.params.id, req.body.password);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// POST /admin/admins/:id/toggle
export async function toggleAdminStatus(req, res, next) {
  try {
    const data = await service.toggleAdminStatus(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// DELETE /admin/admins/:id
export async function deleteAdminUser(req, res, next) {
  try {
    await service.deleteAdminUser(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}
