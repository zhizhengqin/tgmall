// 系统配置控制器 — 平台设置 + 管理员管理
import * as service from '../services/systemConfig.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';

function audit(req, action, detail) {
  return writeAuditLog({
    adminId: req.user?.userId,
    action,
    detail,
    ip: req.ip,
  });
}

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
    const data = await service.updatePlatformSettings(req.validatedBody);
    audit(req, 'PLATFORM_SETTINGS_UPDATE', { fields: Object.keys(req.validatedBody) });
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
    const data = await service.createAdminUser(req.validatedBody);
    audit(req, 'ADMIN_USER_CREATE', { username: data.username, role: data.role });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

// PUT /admin/admins/:id/reset-password
export async function resetAdminPassword(req, res, next) {
  try {
    await service.resetAdminPassword(req.params.id, req.validatedBody.password);
    audit(req, 'ADMIN_USER_RESET_PASSWORD', { targetAdminId: req.params.id });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// POST /admin/admins/:id/toggle
export async function toggleAdminStatus(req, res, next) {
  try {
    const data = await service.toggleAdminStatus(req.params.id);
    audit(req, 'ADMIN_USER_TOGGLE_STATUS', { targetAdminId: req.params.id, status: data.status });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// DELETE /admin/admins/:id
export async function deleteAdminUser(req, res, next) {
  try {
    await service.deleteAdminUser(req.params.id);
    audit(req, 'ADMIN_USER_DELETE', { targetAdminId: req.params.id });
    res.json({ success: true });
  } catch (err) { next(err); }
}
